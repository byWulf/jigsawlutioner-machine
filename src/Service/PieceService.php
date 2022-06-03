<?php

declare(strict_types=1);

namespace App\Service;

use Bywulf\Jigsawlutioner\Dto\Piece;
use Bywulf\Jigsawlutioner\Dto\Side;

class PieceService
{
    public function getClassification(Piece $piece): ?string
    {
        for ($offset = 0; $offset < 4; $offset++) {
            $sides = [];
            for ($sideIndex = 0; $sideIndex < 4; $sideIndex++) {
                $sides[] = $piece->getSide($sideIndex + $offset);
            }

            $combination = implode(',', array_map(fn (Side $side): int => $side->getDirection(), $sides));

            if (str_contains($combination, '0')) {
                return 'border';
            }

            $allowedCombinations = [
                '-1,-1,-1,-1' => 'zero_nops',
                '-1,-1,-1,1' => 'one_nop',
                '-1,-1,1,1' => 'two_neighbour_nops',
                '-1,1,-1,1' => 'two_opposite_nops',
                '-1,1,1,1' => 'three_nops',
                '1,1,1,1' => 'four_nops',
            ];

            if (isset($allowedCombinations[$combination])) {
                return $allowedCombinations[$combination];
            }
        }

        return null;
    }
}
