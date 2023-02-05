<?php

namespace App\Controller\Admin;

use App\Entity\Controller;
use App\Repository\ControllerRepository;
use App\Service\ControllerService;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\KeyValueStore;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Dto\EntityDto;
use EasyCorp\Bundle\EasyAdminBundle\Field\ArrayField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use Symfony\Component\Filesystem\Filesystem;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\HttpClient\Exception\ClientExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\RedirectionExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\ServerExceptionInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

class ControllerCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly ControllerService $controllerService,
        private readonly Filesystem $filesystem,
        private readonly string $setsBaseDir,
        private readonly string $setsPublicDir,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return Controller::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Controller')
            ->setEntityLabelInPlural('Controllers');
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')
                ->hideOnForm(),
            TextField::new('name', 'Name'),
            UrlField::new('base_uri', 'Base url'),
            BooleanField::new('up', 'Up')
                ->setTemplatePath('admin/controller/up.html.twig')
                ->hideOnForm(),
            ArrayField::new('parameters', 'Parameters'),
        ];
    }

    public function configureResponseParameters(KeyValueStore $responseParameters): KeyValueStore
    {
        if ($responseParameters->get('pageName') !== Crud::PAGE_INDEX) {
            return $responseParameters;
        }

        $ups = $this->controllerService->getAllUps();

        /** @var EntityDto $entity */
        foreach ($responseParameters->get('entities', []) as $entity) {
            /** @var Controller $controller */
            $controller = $entity->getInstance();
            $controller->setUp($ups[$controller->getId()] ?? false);
        }

        return $responseParameters;
    }

    #[Route('/controllers/up')]
    public function getAllUps(): JsonResponse
    {
        return new JsonResponse($this->controllerService->getAllUps());
    }

    #[Route('/controllers/{id}/call/{path}', requirements: ['path' => '.+'])]
    public function callController(Controller $controller, string $path, Request $request): Response
    {
        try {
            $response = $this->controllerService->callController($controller, $path, $request->query->all());

            return new Response($response->getContent(), $response->getStatusCode());
        } catch (TransportExceptionInterface) {
            return new Response(null, Response::HTTP_REQUEST_TIMEOUT);
        } catch (ClientExceptionInterface|RedirectionExceptionInterface|ServerExceptionInterface $exception) {
            return new Response(null, Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    #[Route('/controllers/{id}/fetch-photo/{photo}/{filename}', requirements: ['filename' => '^[^.]+$'])]
    public function takeImage(Controller $controller, string $photo, string $filename): JsonResponse
    {
        $response = $this->controllerService->callController($controller, '/fetch-photo', [
            'photo' => $photo,
        ]);

        $this->filesystem->dumpFile(
            rtrim($this->setsBaseDir, '/') . '/' . ltrim($filename, '/') . '.jpg',
            $response->getContent()
        );

        return new JsonResponse([
            'src' => '/' . trim($this->setsPublicDir, '/') . '/' . ltrim($filename, '/') . '.jpg',
        ]);
    }
}
