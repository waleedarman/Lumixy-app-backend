<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $appName;

    public function __construct(string $otp)
    {
        $this->otp = $otp;
        $this->appName = config('app.name', 'Lumixy');
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'رمز إعادة تعيين كلمة المرور - ' . $this->appName,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.password_reset_otp',
        );
    }
}
