<?php

namespace App\Services;

use App\Models\FeedItem;
use App\Models\FeedSource;
use Closure;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use SimpleXMLElement;
use Throwable;

/**
 * Lit les flux RSS / Atom suivis dans la veille et range leurs articles dans feed_items.
 * Lancé par la page à l'ouverture de l'app quand les flux ont plus de 10 minutes (pas de tâche planifiée).
 */
class FeedReader
{
    private const AGENT = 'Mozilla/5.0 (compatible; SycenterVeille/1.0)';

    private const MAX_BYTES = 4_000_000;

    /** Résolution DNS, remplaçable dans les tests (les domaines .test n'existent pas). */
    public static ?Closure $resolveUsing = null;

    /**
     * Adresse publique seulement : un flux ajouté à la main ne doit pas faire lire au serveur
     * une adresse interne (localhost, réseau privé, métadonnées de l'hébergeur).
     */
    public static function isPublic(string $url): bool
    {
        $parts = parse_url($url);
        if (! in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https'], true) || empty($parts['host']) || isset($parts['user'])) {
            return false;
        }
        // Désactivable seulement sur un poste de développement sans DNS direct (sortie par proxy) : jamais en production.
        if (! config('veille.block_private')) {
            return true;
        }
        $host = trim($parts['host'], '[]');
        $ips = filter_var($host, FILTER_VALIDATE_IP) ? [$host] : (self::$resolveUsing ? (self::$resolveUsing)($host) : self::resolve($host));

        return $ips !== [] && collect($ips)->every(fn ($ip) => filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false);
    }

    private static function resolve(string $host): array
    {
        $v4 = gethostbynamel($host) ?: [];
        $v6 = collect(@dns_get_record($host, DNS_AAAA) ?: [])->pluck('ipv6')->filter()->all();

        return [...$v4, ...$v6];
    }

    /** Requête commune : délais courts, redirections suivies seulement vers des adresses publiques. */
    private function request(PendingRequest $r): PendingRequest
    {
        return $r->withUserAgent(self::AGENT)
            ->accept('application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, text/html;q=0.8, */*;q=0.5')
            ->connectTimeout(4)->timeout(10)
            ->withOptions(['allow_redirects' => ['max' => 4, 'protocols' => ['http', 'https'], 'on_redirect' => function ($request, $response, $uri) {
                if (! self::isPublic((string) $uri)) {
                    throw new RuntimeException('redirection vers une adresse interne');
                }
            }]]);
    }

    /** Lit des flux, en parallèle ; une adresse suivie par plusieurs personnes n'est lue qu'une fois. */
    public function refresh(Collection $sources): void
    {
        $byUrl = $sources->groupBy('url');
        $urls = $byUrl->keys()->values();
        $allowed = $urls->filter(fn ($u) => self::isPublic($u));
        $responses = $allowed->isEmpty() ? [] : Http::pool(fn (Pool $pool) => $allowed->map(fn ($u, $i) => $this->request($pool->as("u{$i}"))->get($u))->all());

        foreach ($urls as $i => $url) {
            $result = $allowed->has($i) ? $this->read($responses["u{$i}"] ?? null) : 'adresse non autorisée';
            foreach ($byUrl[$url] as $source) {
                if (is_array($result)) {
                    $this->store($source, $result);
                }
                $source->forceFill(['fetched_at' => now(), 'error' => is_string($result) ? $result : null])->save();
            }
        }

        $this->prune();
    }

    /** Articles d'une réponse, ou motif de l'échec. */
    private function read(mixed $res): array|string
    {
        if (! $res instanceof Response) {
            return 'injoignable';
        }
        if (! $res->successful()) {
            return 'erreur HTTP '.$res->status();
        }
        if (strlen($res->body()) > self::MAX_BYTES) {
            return 'flux trop volumineux';
        }

        return $this->parse($res->body()) ?? 'pas un flux RSS ou Atom';
    }

    /**
     * Trouve le flux derrière une adresse : le flux lui-même, ou la page d'un site qui l'annonce
     * (<link rel="alternate" type="application/rss+xml">). Renvoie le flux et ses articles, ou un message pour Kevin.
     *
     * @return array{url: string, title: string, lang: ?string, items: array}|string
     */
    public function discover(string $url): array|string
    {
        $tried = [];
        if (! parse_url($url, PHP_URL_PATH)) {
            $url .= '/';
        }
        for ($hop = 0; $hop < 2; $hop++) {
            if (! self::isPublic($url)) {
                return 'Cette adresse n’est pas accessible depuis Internet.';
            }
            try {
                $res = $this->request(Http::createPendingRequest())->get($url);
            } catch (Throwable) {
                return 'Le site ne répond pas.';
            }
            if (! $res->successful()) {
                return "Le site répond par une erreur ({$res->status()}).";
            }
            $body = substr($res->body(), 0, self::MAX_BYTES);
            if ($doc = $this->load($body)) {
                $items = $this->parse($body);
                if ($items !== null) {
                    $title = $this->text((string) ($doc->channel->title ?? '') ?: (string) ($doc->title ?? ''), 80);
                    $lang = strtolower(substr((string) ($doc->channel->language ?? '') ?: (string) $doc->attributes('xml', true)['lang'], 0, 2));

                    return ['url' => $url, 'title' => $title, 'lang' => $lang !== '' ? $lang : null, 'items' => $items];
                }
            }
            $tried[] = $url;
            $next = $this->announcedFeed($body, (string) ($res->effectiveUri() ?? $url));
            if (! $next || in_array($next, $tried, true)) {
                break;
            }
            $url = $next;
        }

        return 'Aucun flux RSS ou Atom trouvé à cette adresse.';
    }

    /** Premier flux annoncé dans l'en-tête d'une page HTML, en adresse absolue. */
    private function announcedFeed(string $html, string $base): ?string
    {
        preg_match_all('/<link\b[^>]*>/i', $html, $tags);
        foreach ($tags[0] as $tag) {
            if (preg_match('/type=["\']application\/(rss|atom)\+xml["\']/i', $tag) && preg_match('/href=["\']([^"\']+)["\']/i', $tag, $m)) {
                $href = html_entity_decode($m[1]);

                return $this->absolute($href, $base);
            }
        }

        return null;
    }

    private function absolute(string $href, string $base): ?string
    {
        if (preg_match('~^https?://~i', $href)) {
            return $href;
        }
        $b = parse_url($base);
        if (! isset($b['scheme'], $b['host'])) {
            return null;
        }
        $root = $b['scheme'].'://'.$b['host'].(isset($b['port']) ? ':'.$b['port'] : '');
        if (str_starts_with($href, '//')) {
            return $b['scheme'].':'.$href;
        }
        if (str_starts_with($href, '/')) {
            return $root.$href;
        }

        return $root.rtrim(dirname($b['path'] ?? '/'), '/').'/'.$href;
    }

    private function load(string $xml): ?SimpleXMLElement
    {
        $previous = libxml_use_internal_errors(true);
        try {
            $doc = simplexml_load_string(trim($xml), SimpleXMLElement::class, LIBXML_NOCDATA | LIBXML_NONET);
        } catch (Throwable) {
            $doc = false;
        } finally {
            libxml_clear_errors();
            libxml_use_internal_errors($previous);
        }

        return $doc === false ? null : $doc;
    }

    /**
     * Lit un flux RSS 2.0, RSS 1.0 ou Atom. Null si le document n'est pas un flux.
     *
     * @return list<array{guid: string, title: string, summary: ?string, url: string, image: ?string, published_at: Carbon}>|null
     */
    public function parse(string $xml): ?array
    {
        $doc = $this->load($xml);
        if (! $doc) {
            return null;
        }

        $nodes = match (true) {
            isset($doc->channel->item) => $doc->channel->item,
            isset($doc->item) => $doc->item,
            isset($doc->entry) => $doc->entry,
            default => null,
        };
        if ($nodes === null) {
            return $doc->getName() === 'rss' || $doc->getName() === 'feed' ? [] : null;
        }

        $items = [];
        foreach ($nodes as $node) {
            if ($item = $this->item($node)) {
                $items[] = $item;
            }
        }

        return $items;
    }

    private function item(SimpleXMLElement $n): ?array
    {
        $ns = $n->getNamespaces(true);
        $dc = isset($ns['dc']) ? $n->children($ns['dc']) : null;
        $content = isset($ns['content']) ? (string) $n->children($ns['content'])->encoded : '';

        $title = $this->text((string) $n->title, 300);
        $url = $this->link($n);
        if ($title === '' || ! $url) {
            return null;
        }

        $raw = (string) ($n->description ?? '') ?: (string) ($n->summary ?? '') ?: (string) ($n->content ?? '') ?: $content;
        $summary = $this->summary($raw, $title);
        $date = (string) ($n->pubDate ?? '') ?: (string) ($dc?->date ?? '') ?: (string) ($n->published ?? '') ?: (string) ($n->updated ?? '');

        return [
            'guid' => sha1(trim((string) ($n->guid ?? '')) ?: trim((string) ($n->id ?? '')) ?: $url),
            'title' => $title,
            'summary' => $summary,
            'url' => $url,
            'image' => $this->image($n, $ns, $content ?: $raw),
            'published_at' => $this->date($date),
        ];
    }

    /** Lien de l'article. Seuls http et https passent : un lien javascript: ne doit jamais arriver dans la page. */
    private function link(SimpleXMLElement $n): ?string
    {
        $candidates = [];
        foreach ($n->link as $l) {
            $href = (string) $l['href'];
            if ($href !== '') {
                $rel = (string) $l['rel'];
                $rel === '' || $rel === 'alternate' ? array_unshift($candidates, $href) : $candidates[] = $href;
            } elseif (trim((string) $l) !== '') {
                array_unshift($candidates, trim((string) $l));
            }
        }
        $guid = trim((string) ($n->guid ?? ''));
        if ($guid !== '' && (string) ($n->guid['isPermaLink'] ?? 'true') !== 'false') {
            $candidates[] = $guid;
        }

        foreach ($candidates as $c) {
            if ($safe = $this->safeUrl($c)) {
                return $safe;
            }
        }

        return null;
    }

    /** Image de l'article : media RSS, pièce jointe image, ou première image du contenu. */
    private function image(SimpleXMLElement $n, array $ns, string $html): ?string
    {
        $found = [];
        if (isset($ns['media'])) {
            $media = $n->children($ns['media']);
            foreach ([$media->content, $media->group?->content, $media->thumbnail] as $set) {
                foreach ($set ?? [] as $m) {
                    // Élément d'un autre espace de noms : ses attributs se lisent par attributes(), pas par $m['url'].
                    $a = $m->attributes();
                    $type = (string) $a['type'];
                    $medium = (string) $a['medium'];
                    if ($medium === 'image' || str_starts_with($type, 'image/') || ($type === '' && $medium === '')) {
                        $found[] = (string) $a['url'];
                    }
                }
            }
        }
        foreach ($n->enclosure ?? [] as $e) {
            if (str_starts_with((string) $e['type'], 'image/')) {
                $found[] = (string) $e['url'];
            }
        }
        if (preg_match('/<img[^>]+src=["\']([^"\']+)["\']/i', $html, $m)) {
            $found[] = html_entity_decode($m[1]);
        }

        foreach ($found as $f) {
            $safe = $this->safeUrl($f, httpsOnly: true);
            if ($safe && ! preg_match('/(pixel|tracking|feeds\.feedburner\.com\/~r|gravatar|emoji|\.gif($|\?))/i', $safe)) {
                return $safe;
            }
        }

        return null;
    }

    private function safeUrl(string $url, bool $httpsOnly = false): ?string
    {
        $url = trim($url);
        if (str_starts_with($url, '//')) {
            $url = 'https:'.$url;
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $ok = $httpsOnly ? $scheme === 'https' : in_array($scheme, ['http', 'https'], true);

        return $ok && strlen($url) <= 2048 && filter_var($url, FILTER_VALIDATE_URL) ? $url : null;
    }

    /** Résumé court : texte brut, sans liens isolés ni mentions de flux, coupé proprement. */
    private function summary(string $html, string $title): ?string
    {
        $text = preg_replace('/<(script|style)\b.*?<\/\1>/is', ' ', $html);
        $text = $this->text($text ?? '', 4000);
        $text = preg_replace('~^(https?://\S+\s*)+~i', '', $text);
        $text = preg_replace('/^(Summary|Résumé|TL;DR)\s*:\s*/iu', '', (string) $text);
        $text = $this->withoutTitle((string) $text, $title);
        $text = preg_replace('/\s*(The post|Le post|L’article|L\'article|Cet article) .{0,200}(appeared first on|est apparu en premier sur).*$/iu', '', $text);
        $text = preg_replace('/\s*(\[(…|\.\.\.)\]|Read more|Lire la suite|Continue reading).*$/iu', '…', $text);
        $text = trim((string) $text);
        if ($text === '' || mb_strlen($text) < 25 || in_array(mb_strtolower($text), ['comments', 'commentaires'], true) || Str::startsWith($text, $title) && mb_strlen($text) <= mb_strlen($title) + 5) {
            return null;
        }

        return Str::limit($text, 240, '…', preserveWords: true);
    }

    /** Certains flux répètent le titre en tête du résumé : on le retire, ponctuation comprise. */
    private function withoutTitle(string $text, string $title): string
    {
        $norm = fn (string $w) => mb_strtolower(preg_replace('/[^\p{L}\p{N}]/u', '', $w) ?? '');
        $titleWords = array_values(array_filter(array_map($norm, preg_split('/\s+/u', $title) ?: []), fn ($w) => $w !== ''));
        $words = preg_split('/(\s+)/u', $text) ?: [];
        if (count($titleWords) < 3) {
            return $text;
        }
        $i = 0;
        $matched = 0;
        while ($i < count($words) && $matched < count($titleWords)) {
            $w = $norm($words[$i]);
            if ($w !== '' && $w !== $titleWords[$matched]) {
                return $text;
            }
            $matched += $w !== '' ? 1 : 0;
            $i++;
        }

        return $matched === count($titleWords) ? ltrim(implode(' ', array_slice($words, $i)), " \t\n:.-–—") : $text;
    }

    private function text(string $html, int $limit): string
    {
        $text = html_entity_decode(strip_tags(str_replace(['<br', '</p>'], [' <br', ' </p>'], $html)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

        return mb_substr($text, 0, $limit);
    }

    private function date(string $value): Carbon
    {
        try {
            $date = $value !== '' ? Carbon::parse($value) : now();
        } catch (Throwable) {
            $date = now();
        }

        // Ramené au fuseau de l'application : un flux en +05:30 ne doit pas décaler l'heure enregistrée.
        $date = $date->setTimezone(config('app.timezone'));

        return $date->isFuture() ? now() : $date;
    }

    /** Enregistre les articles récents d'une source, sans doublon. Un article déjà là garde son état « mis de côté ». */
    public function store(FeedSource $source, array $items): int
    {
        $limit = now()->subDays(config('veille.keep_days'));
        $kept = collect($items)->filter(fn ($i) => $i['published_at']->gt($limit))
            ->sortByDesc(fn ($i) => $i['published_at']->getTimestamp())->unique('guid')->take(config('veille.per_source'));

        foreach ($kept as $i) {
            FeedItem::updateOrCreate(['feed_source_id' => $source->id, 'guid' => $i['guid']], $i);
        }

        return $kept->count();
    }

    /** Oublie les articles de plus de 30 jours, sauf ceux mis de côté. */
    private function prune(): void
    {
        FeedItem::whereNull('saved_at')->where('published_at', '<', now()->subDays(config('veille.keep_days')))->delete();
    }
}
