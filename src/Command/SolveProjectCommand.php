<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Piece;
use App\Repository\ProjectRepository;
use Bywulf\Jigsawlutioner\Dto\Piece as PieceDto;
use Bywulf\Jigsawlutioner\Service\MatchingMapGenerator;
use Bywulf\Jigsawlutioner\Service\PuzzleSolver\PuzzleSolverInterface;
use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand('app:project:solve')]
class SolveProjectCommand extends Command
{
    public function __construct(
        private readonly MatchingMapGenerator $matchingMapGenerator,
        private readonly PuzzleSolverInterface $puzzleSolver,
        private readonly ProjectRepository $projectRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('projectId', InputArgument::REQUIRED);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $projectId = (int) $input->getArgument('projectId');

        $project = $this->projectRepository->find($projectId);
        if ($project === null) {
            throw new InvalidArgumentException('Project not found.');
        }

        $pieceEntities = array_filter(
            $project->getPieces()->toArray(),
            static fn(Piece $piece): bool => $piece->getBox() !== null && $piece->getData() !== null
        );

        $pieces = array_map(fn (Piece $piece): PieceDto => $piece->getData(), $pieceEntities);

        $matchingMap = $this->matchingMapGenerator->getMatchingMap($pieces);

        $this->puzzleSolver->setStepProgressionCallback(function (string $message, int $groups, int $biggestGroup) use ($output): void {
            $output->writeln(sprintf('%s / %s / %s', $groups, $biggestGroup, $message));
        });

        $solution = $this->puzzleSolver->findSolution($pieces, $matchingMap);

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

        $this->entityManager->flush();

        return Command::SUCCESS;
    }
}
