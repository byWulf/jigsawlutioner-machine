<?php

namespace App\Controller\Admin;

use App\Dto\SolveMessage;
use App\Entity\Piece;
use App\Entity\Project;
use App\Repository\ControllerRepository;
use App\Repository\PieceRepository;
use App\Repository\SetupRepository;
use App\Service\PieceService;
use Bywulf\Jigsawlutioner\Dto\Context\ByWulfBorderFinderContext;
use Bywulf\Jigsawlutioner\Dto\Piece as PieceDto;
use Bywulf\Jigsawlutioner\Exception\BorderParsingException;
use Bywulf\Jigsawlutioner\Exception\PieceAnalyzerException;
use Bywulf\Jigsawlutioner\Exception\SideParsingException;
use Bywulf\Jigsawlutioner\Service\PieceAnalyzer;
use Bywulf\Jigsawlutioner\Service\PieceRecognizer;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\KeyValueStore;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use InvalidArgumentException;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Messenger\MessageBusInterface;
use Symfony\Component\Process\Process;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Component\Serializer\SerializerInterface;

class ProjectCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly PieceAnalyzer $pieceAnalyzer,
        private readonly string $setsBaseDir,
        private readonly EntityManagerInterface $entityManager,
        private readonly SerializerInterface $serializer,
        private readonly ControllerRepository $controllerRepository,
        private readonly SetupRepository $setupRepository,
        private readonly PieceRepository $pieceRepository,
        private readonly PieceService $pieceService,
        private readonly PieceRecognizer $pieceRecognizer,
        private readonly Filesystem $filesystem,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return Project::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Project')
            ->setEntityLabelInPlural('Projects');
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')
                ->hideOnForm(),
            TextField::new('name', 'Name'),
            IntegerField::new('pieces', 'Scanned pieces')
                ->setTemplatePath('admin/project/pieces.html.twig')
                ->hideOnForm()
                ->setSortable(false),
        ];
    }

    public function configureActions(Actions $actions): Actions
    {
        return parent::configureActions($actions)
            ->add(
                Crud::PAGE_INDEX,
                Action::new('run', 'Run machine')
                    ->linkToCrudAction('run')
            );
    }

    public function run(AdminContext $context): KeyValueStore
    {
        return KeyValueStore::new([
            'pageName' => 'run',
            'templatePath' => 'admin/project/run.html.twig',
            'entity' => $context->getEntity(),
            'controllers' => $this->controllerRepository->findAll(),
            'setups' => $this->setupRepository->findAll(),
        ]);
    }

    #[Route('projects/{id}')]
    public function getProject(Project $project, SerializerInterface $serializer): JsonResponse
    {
        return new JsonResponse($this->serializer->serialize($project, 'json', ['groups' => 'project']), json: true);
    }

    #[Route('projects/{id}/solution-status')]
    public function getSolvingStatus(Project $project): JsonResponse
    {
        return new JsonResponse([
            'solved' => $project->isSolved(),
            'solvingStatus' => $project->getSolvingStatus(),
            'solvedGroups' => $project->getSolvedGroups(),
            'biggestGroup' => $project->getBiggestGroup(),
        ]);
    }

    #[Route('/projects/{id}/pieces/{pieceIndex}/analyze')]
    public function analyzePiece(Project $project, int $pieceIndex, Request $request): JsonResponse
    {
        $silhouetteFilename = $request->query->get('silhouetteFilename') . '.jpg';
        if (!$silhouetteFilename) {
            throw new InvalidArgumentException('Query parameter "silhouetteFilename" missing.');
        }
        $silhouetteImage = imagecreatefromjpeg(rtrim($this->setsBaseDir) . '/' . ltrim($silhouetteFilename));
        if ($silhouetteImage === false) {
            throw new InvalidArgumentException('"silhouetteFilename" could not be read.');
        }

        $colorFilename = $request->query->get('colorFilename') . '.jpg';
        if (!$colorFilename) {
            throw new InvalidArgumentException('Query parameter "colorFilename" missing.');
        }
        $colorImage = imagecreatefromjpeg(rtrim($this->setsBaseDir) . '/' . ltrim($colorFilename));
        if ($colorImage === false) {
            throw new InvalidArgumentException('"colorFilename" could not be read.');
        }

        $resizedColorImage = imagecreatetruecolor((int) round(imagesx($colorImage) / 10), (int) round(imagesy($colorImage) / 10));
        imagecopyresampled($resizedColorImage, $colorImage, 0, 0, 0,0, (int) round(imagesx($colorImage) / 10), (int) round(imagesy($colorImage) / 10), imagesx($colorImage), imagesy($colorImage));

        try {
            $piece = $this->pieceAnalyzer->getPieceFromImage(
                $pieceIndex,
                $silhouetteImage,
                new ByWulfBorderFinderContext(
                    threshold: 0.65,
                    transparentImages: [
                        $resizedColorImage,
                    ]
                )
            );
        } catch (BorderParsingException|PieceAnalyzerException|SideParsingException $exception) {
            $this->filesystem->remove(rtrim($this->setsBaseDir) . '/' . ltrim($silhouetteFilename));
            $this->filesystem->remove(rtrim($this->setsBaseDir) . '/' . ltrim($colorFilename));

            throw $exception;
        }

        $piece->reduceData();

        $maskFilename =  $request->query->get('silhouetteFilename') . '_mask.png';
        imagepng($silhouetteImage, rtrim($this->setsBaseDir) . '/' . ltrim($maskFilename));

        $transparentSmallFilename = $request->query->get('silhouetteFilename') . '_transparent_small.png';
        imagepng($resizedColorImage, rtrim($this->setsBaseDir) . '/' . ltrim($transparentSmallFilename));

        $pieceEntity = new Piece();
        $pieceEntity
            ->setProject($project)
            ->setPieceIndex($pieceIndex)
            ->setData($piece)
            ->setClassification($this->pieceService->getClassification($piece))
            ->setImages([
                'silhouette' => $silhouetteFilename,
                'color' => $request->query->get('colorFilename') ? $colorFilename : null,
                'mask' => $maskFilename,
                'transparentSmall' => $transparentSmallFilename,
            ])
        ;

        $this->entityManager->persist($pieceEntity);
        $project->setSolved(false);
        $this->entityManager->flush();

        return new JsonResponse($this->serializer->serialize($pieceEntity, 'json', ['groups' => 'project']), json: true);
    }

    #[Route('/projects/{id}/pieces/recognize')]
    public function recognizePiece(Project $project, Request $request): JsonResponse
    {
        $silhouetteFilename = $request->query->get('silhouetteFilename') . '.jpg';
        if (!$silhouetteFilename) {
            throw new InvalidArgumentException('Query parameter "silhouetteFilename" missing.');
        }
        $silhouetteImage = imagecreatefromjpeg(rtrim($this->setsBaseDir) . '/' . ltrim($silhouetteFilename));
        if ($silhouetteImage === false) {
            throw new InvalidArgumentException('"silhouetteFilename" could not be read.');
        }

        try {
            $piece = $this->pieceAnalyzer->getPieceFromImage(
                0,
                $silhouetteImage,
                new ByWulfBorderFinderContext(
                    threshold: 0.65,
                )
            );

            $possibleEntities = $this->pieceRepository->findby([
                'project' => $project,
                'classification' => $this->pieceService->getClassification($piece)
            ]);

            $existingPieces = array_map(fn (Piece $piece): PieceDto => $piece->getData(), $possibleEntities);

            $piece = $this->pieceRecognizer->findExistingPiece($piece, $existingPieces);

            if ($piece !== null) {
                foreach ($possibleEntities as $entity) {
                    if ($entity->getPieceIndex() === $piece->getIndex()) {
                        $entity->setData($piece);
                        // TODO: Save correct rotation so the original image is rotated as the newly scanned piece
                        return new JsonResponse($this->serializer->serialize($entity, 'json', ['groups' => 'project']), json: true);
                    }
                }
            }

            return new JsonResponse(null);
        } finally {
            $this->filesystem->remove(rtrim($this->setsBaseDir) . '/' . ltrim($silhouetteFilename));
        }
    }

    #[Route('/projects/{id}/pieces/{pieceIndex}/box/{box}', requirements: ['box' => '[0-9]*'])]
    public function putPieceInBox(Project $project, int $pieceIndex, ?int $box): JsonResponse
    {
        $piece = $this->pieceRepository->findOneBy([
            'project' => $project,
            'pieceIndex' => $pieceIndex,
        ]);

        if ($piece === null) {
            throw new NotFoundHttpException('Piece not found.');
        }

        $piece->setBox($box);
        $this->entityManager->flush();

        return new JsonResponse($this->serializer->serialize($piece, 'json', ['groups' => 'project']), json: true);
    }

    #[Route('/projects/{id}/solve')]
    public function solvePuzzle(Project $project, MessageBusInterface $messageBus): JsonResponse
    {
        $project->setSolved(false);
        $this->entityManager->flush();

        $messageBus->dispatch(new SolveMessage($project->getId()));

        return new JsonResponse(true);
    }
}
