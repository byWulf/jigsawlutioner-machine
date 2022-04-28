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
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class ControllerCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly ControllerService $controllerService,
        private readonly ControllerRepository $controllerRepository,
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

        dump($ups);

        /** @var EntityDto $entity */
        foreach ($responseParameters->get('entities', []) as $entity) {
            /** @var Controller $controller */
            $controller = $entity->getInstance();
            $controller->setUp($ups[$controller->getId()] ?? false);
        }

        dump($responseParameters->get('entities', []));

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
            $response = $this->controllerService->callController($controller, $path, $request->query->all(), [
                'timeout' => 2,
            ]);

            return new Response(null, $response->getStatusCode());
        } catch (TransportExceptionInterface) {
            return new Response(null, Response::HTTP_REQUEST_TIMEOUT);
        }
    }
}
