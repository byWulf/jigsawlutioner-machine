<?php

declare(strict_types=1);

namespace App\Doctrine\Type;

use Bywulf\Jigsawlutioner\Dto\Piece;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\TextType;
use InvalidArgumentException;
use function is_string;

class PieceType extends TextType
{
    public const TYPE = 'piece';

    public function getName(): string
    {
        return self::TYPE;
    }

    public function convertToPHPValue($value, AbstractPlatform $platform): ?Piece
    {
        if ($value === null) {
            return null;
        }

        if (!is_string($value)) {
            throw new InvalidArgumentException('Expected string, got ' . get_debug_type($value) . '.');
        }

        return Piece::fromSerialized($value);
    }

    public function convertToDatabaseValue($value, AbstractPlatform $platform): ?string
    {
        if ($value === null) {
            return null;
        }

        if (!$value instanceof Piece) {
            throw new InvalidArgumentException('Expected ' . Piece::class . ', got ' . get_debug_type($value) . '.');
        }

        return serialize($value);
    }
}
