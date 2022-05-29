<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Piece as PieceEntity;
use App\Repository\PieceRepository;
use Bywulf\Jigsawlutioner\Dto\Context\ByWulfBorderFinderContext;
use Bywulf\Jigsawlutioner\Dto\Piece;
use Bywulf\Jigsawlutioner\Service\PieceAnalyzer;
use Doctrine\ORM\EntityManagerInterface;
use LogicException;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Throwable;

#[AsCommand('app:pieces:reanalyze')]
class ReanalyzePiecesCommand extends Command
{
    public function __construct(
        private readonly PieceRepository $pieceRepository,
        private readonly string $setsBaseDir,
        private readonly PieceAnalyzer $pieceAnalyzer,
        private readonly EntityManagerInterface $entityManager
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $io = new SymfonyStyle($input, $output);

        $pieces = $this->pieceRepository->findAll();

        $io->progressStart(count($pieces));

        foreach ($pieces as $pieceEntity) {
            try {
                $piece = $this->getPiece($pieceEntity);
            } catch (Throwable $exception) {
                dump($exception);
                continue;
            }

            $pieceEntity->setData($piece);

            $io->progressAdvance();
        }
        $io->progressFinish();

        $this->entityManager->flush();

        return Command::SUCCESS;
    }

    private function getPiece(PieceEntity $pieceEntity): Piece
    {
        $silhouetteFilename = $pieceEntity->getImages()['silhouette'] ?? null;
        if (!$silhouetteFilename) {
            throw new LogicException('No silhouette image.');
        }
        $silhouetteImage = imagecreatefromjpeg(rtrim($this->setsBaseDir) . '/' . ltrim($silhouetteFilename));
        if ($silhouetteImage === false) {
            throw new LogicException('Could not load image.');
        }

        $piece = $this->pieceAnalyzer->getPieceFromImage(
            $pieceEntity->getPieceIndex(),
            $silhouetteImage,
            new ByWulfBorderFinderContext(
                threshold: 0.65
            )
        );
        $piece->reduceData();

        return $piece;
    }
}
