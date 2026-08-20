<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Attribute\Route;

class ContactController extends AbstractController
{
    #[Route('/api/contact', name: 'api_contact', methods: ['POST'])]
    public function sendContactEmail(Request $request, MailerInterface $mailer): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $email       = $data['email'] ?? null;
        $titre       = $data['titre'] ?? $data['sujet'] ?? null;
        $description = $data['description'] ?? $data['message'] ?? null;

        if (!$email || !$titre || !$description) {
            return new JsonResponse(['error' => 'Champs manquants.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $emailObj = (new Email())
                ->from($email)
                ->to('contact@viteetgourmand.fr')
                ->subject('[Demande de contact] ' . $titre)
                ->html("
                    <h2>Nouvelle demande de contact</h2>
                    <p><strong>De :</strong> " . htmlspecialchars($email) . "</p>
                    <p><strong>Sujet :</strong> " . htmlspecialchars($titre) . "</p>
                    <hr>
                    <p><strong>Message :</strong></p>
                    <p>" . nl2br(htmlspecialchars($description)) . "</p>
                ");

            $mailer->send($emailObj);

            return new JsonResponse(['message' => 'Message envoyé avec succès !'], Response::HTTP_OK);

        } catch (\Exception $e) {
            return new JsonResponse(['error' => $e->getMessage()], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}