<?php

namespace App\Controller\Admin;

use App\Entity\Controller;
use App\Entity\Project;
use App\Entity\Setup;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class DashboardController extends AbstractDashboardController
{
    #[Route('/', name: 'admin')]
    public function index(): Response
    {
        return $this->render('admin/dashboard.html.twig');
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('jigsawlutioner.machine');
    }

    public function configureMenuItems(): iterable
    {
        yield MenuItem::linkToDashboard('Dashboard', 'fa fa-home');
        yield MenuItem::linkToCrud('Controllers', 'fab fa-raspberry-pi', Controller::class);
        yield MenuItem::linkToCrud('Setups', 'fas fa-network-wired', Setup::class);
        yield MenuItem::linkToCrud('Projects', 'fas fa-list', Project::class);
    }
}
