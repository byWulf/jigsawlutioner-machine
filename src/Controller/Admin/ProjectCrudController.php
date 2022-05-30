<?php

namespace App\Controller\Admin;

use App\Entity\Piece;
use App\Entity\Project;
use App\Repository\ControllerRepository;
use App\Repository\PieceRepository;
use App\Repository\SetupRepository;
use Bywulf\Jigsawlutioner\Dto\Context\ByWulfBorderFinderContext;
use Bywulf\Jigsawlutioner\Service\PieceAnalyzer;
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
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
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
        private readonly PieceRepository $pieceRepository
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

        $piece = $this->pieceAnalyzer->getPieceFromImage(
            $pieceIndex,
            $silhouetteImage,
            new ByWulfBorderFinderContext(
                threshold: 0.65,
                transparentImages: [
                    $colorImage,
                    $resizedColorImage,
                ]
            )
        );
        $piece->reduceData();

        $maskFilename =  $request->query->get('silhouetteFilename') . '_mask.png';
        imagepng($silhouetteImage, rtrim($this->setsBaseDir) . '/' . ltrim($maskFilename));

        $transparentFilename =  $request->query->get('silhouetteFilename') . '_transparent.png';
        imagepng($colorImage, rtrim($this->setsBaseDir) . '/' . ltrim($transparentFilename));

        $transparentSmallFilename = $request->query->get('silhouetteFilename') . '_transparent_small.png';
        imagepng($resizedColorImage, rtrim($this->setsBaseDir) . '/' . ltrim($transparentSmallFilename));

        $pieceEntity = new Piece();
        $pieceEntity
            ->setProject($project)
            ->setPieceIndex($pieceIndex)
            ->setData($piece)
            ->setImages([
                'silhouette' => $silhouetteFilename,
                'color' => $colorFilename,
                'mask' => $maskFilename,
                'transparent' => $transparentFilename,
                'transparentSmall' => $transparentSmallFilename,
            ])
        ;

        $this->entityManager->persist($pieceEntity);
        $project->setSolved(false);
        $this->entityManager->flush();

        return new JsonResponse($this->serializer->serialize($pieceEntity, 'json', ['groups' => 'project']), json: true);
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
    public function solvePuzzle(Project $project): JsonResponse
    {
        $project->setSolved(false);
        $this->entityManager->flush();

        // TODO: Start async process

        return new JsonResponse(true);
    }
}
