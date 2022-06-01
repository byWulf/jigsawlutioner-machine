<?php

declare(strict_types=1);

namespace App\Dto;

class SolveMessage
{
    public function __construct(
        public readonly int $projectId,
    ) {
    }
}
