<?php

namespace App\Services;

use App\Models\FeedItem;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use SimpleXMLElement;
use Throwable;

/**
 * Récupère les flux RSS / Atom de config/veille.php et range les articles dans feed_items.
 * Pas de processus d'arrière-plan sur l'hébergement : la récupération est lancée par la page quand le cache a vieilli.
 */
class FeedReader
{
    public const REFRESHED_AT = 'veille.refreshed_at';

    private const AGENT = 'Mozilla/5.0 (compatible; SycenterVeille/1.0)';

    private const MAX_BYTES = 4_000_000;

    public static function refreshedAt(): ?Carbon
    {
        $at = Cache::get(self::REFRESHED_AT);

        return $at ? Carbon::parse($at) : null;
    }

    public static function stale(): bool
    {
        $at = self::refreshedAt();

        return ! $at || $at->lt(now()->subMinutes(config('veille.refresh_minutes')));
    }

    /**
     * Récupère toutes les sources en parallèle. Renvoie, par source, le nombre d'articles lus ou le motif d'échec.
     *
     * @return array<string, int|string>
     */
    public function refresh(): array
    {
        $sources = config('veille.sources');
        $responses = Http::pool(fn (Pool $pool) => collect($sources)->map(
            fn ($s, $key) => $pool->as($key)->withUserAgent(self::AGENT)->accept('application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5')
                ->connectTimeout(4)->timeout(10)->get($s['url'])
        )->all());

        $report = [];
        foreach ($sources as $key => $source) {
            $res = $responses[$key] ?? null;
            if (! $res instanceof Response) {
                $report[$key] = 'injoignable';

                continue;
            }
            if (! $res->successful()) {
                $report[$key] = 'HTTP '.$res->status();

                continue;
            }
            if (strlen($res->body()) > self::MAX_BYTES) {
                $report[$key] = 'flux trop volumineux';

                continue;
            }
            $items = $this->parse($res->body());
            if ($items === null) {
                $report[$key] = 'flux illisible';

                continue;
            }
            $report[$key] = $this->store($key, $source['theme'], $items);
        }

        $this->prune();
        Cache::forever(self::REFRESHED_AT, now()->toIso8601String());

        return $report;
    }

    /**
     * Lit un flux RSS 2.0, RSS 1.0 ou Atom. Null si le document n'est pas un flux.
     *
     * @return list<array{guid: string, title: string, summary: ?string, url: string, image: ?string, published_at: Carbon}>|null
     */
    public function parse(string $xml): ?array
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
        if ($doc === false) {
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

    /** Enregistre les articles récents d'une source, sans doublon. Renvoie le nombre d'articles retenus. */
    private function store(string $source, string $theme, array $items): int
    {
        $limit = now()->subDays(config('veille.keep_days'));
        $kept = collect($items)->filter(fn ($i) => $i['published_at']->gt($limit))
            ->sortByDesc(fn ($i) => $i['published_at']->getTimestamp())->unique('guid')->take(config('veille.per_source'));

        foreach ($kept as $i) {
            FeedItem::updateOrCreate(['guid' => $i['guid']], [...$i, 'source' => $source, 'theme' => $theme]);
        }

        return $kept->count();
    }

    /** Oublie les vieux articles et ceux de sources retirées, sauf ceux que quelqu'un a mis de côté. */
    private function prune(): void
    {
        FeedItem::whereDoesntHave('savers')
            ->where(fn ($q) => $q->where('published_at', '<', now()->subDays(config('veille.keep_days')))
                ->orWhereNotIn('source', array_keys(config('veille.sources'))))
            ->delete();
    }
}
