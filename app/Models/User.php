<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'apps',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'veille_seen_at',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'apps' => 'array',
            'veille_seen_at' => 'datetime',
        ];
    }

    /** Articles de veille mis de côté pour plus tard. */
    public function savedFeedItems(): BelongsToMany
    {
        return $this->belongsToMany(FeedItem::class, 'feed_saves')->withTimestamps();
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function practices(): HasMany
    {
        return $this->hasMany(Practice::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(Note::class);
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    /** Le rôle "viewer" consulte et télécharge, sans créer ni modifier. */
    public function canWrite(): bool
    {
        return $this->role !== 'viewer';
    }

    public function canUse(string $app): bool
    {
        $def = config("apps.$app");
        if (! $def || ! $def['active']) {
            return false;
        }
        if ($this->isOwner()) {
            return true;
        }

        return empty($def['owner_only']) && in_array($app, $this->apps ?? [], true);
    }
}
