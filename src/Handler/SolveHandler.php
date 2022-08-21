<?php

declare(strict_types=1);

namespace App\Handler;

use App\Dto\SolveMessage;
use App\Entity\Piece;
use App\Repository\ProjectRepository;
use Bywulf\Jigsawlutioner\Dto\Piece as PieceDto;
use Bywulf\Jigsawlutioner\Dto\ReducedPiece;
use Bywulf\Jigsawlutioner\Service\MatchingMapGenerator;
use Bywulf\Jigsawlutioner\Service\PuzzleSolver\PuzzleSolverInterface;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class SolveHandler
{
    public function __construct(
        private readonly MatchingMapGenerator $matchingMapGenerator,
        private readonly PuzzleSolverInterface $puzzleSolver,
        private readonly ProjectRepository $projectRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function __invoke(SolveMessage $message): void
    {
        $project = $this->projectRepository->find($message->projectId);
        if ($project === null) {
            throw new InvalidArgumentException('Project not found.');
        }

        $pieceEntities = array_filter(
            $project->getPieces()->toArray(),
            static fn(Piece $piece): bool => $piece->getBox() !== null && $piece->getData() !== null
        );

        $pieces = array_map(fn (Piece $piece): PieceDto => $piece->getData(), $pieceEntities);

        $project->setBiggestGroup(1);
        $project->setSolvedGroups(count($pieces));
        $project->setSolvingStatus('Generating matching map...');
        $this->entityManager->flush();

        $matchingMap = $this->matchingMapGenerator->getMatchingMap($pieces);

        $reducedPieces = array_map(fn (PieceDto $piece): ReducedPiece => ReducedPiece::fromPiece($piece), $pieces);

        $lastSave = microtime(true);
        $this->puzzleSolver->setStepProgressionCallback(function (string $message, int $groups, int $biggestGroup) use ($project, &$lastSave): void {
            $project->setBiggestGroup($biggestGroup);
            $project->setSolvedGroups($groups);
            $project->setSolvingStatus($message);

            if (microtime(true) - $lastSave >= 1) {
                $this->entityManager->flush();
                $lastSave = microtime(true);
            }
        });

        $solution = $this->puzzleSolver->findSolution($reducedPieces, $matchingMap);

        foreach ($solution->getGroups() as $group) {
            foreach ($group->getPlacements() as $placement) {
                foreach ($project->getPieces() as $pieceEntity) {
                    if ($pieceEntity->getPieceIndex() !== $placement->getPiece()->getIndex()) {
                        continue;
                    }

                    $pieceEntity
                        ->setGroupIndex($group->getIndex())
                        ->setX($placement->getX())
                        ->setY($placement->getY())
                        ->setTopSide($placement->getTopSideIndex());
                }
            }
        }

        $project->setSolved(true);
        $project->setSolvingStatus(null);

        $this->entityManager->flush();
    }
}
