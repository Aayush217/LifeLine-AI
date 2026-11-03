"""
LifeLine AI Email Service.
Sends transactional emails (Welcome, Password Reset, Password Changed Confirmation,
Appointment Confirmation, and Donation Intake Completion).
Configurable via SMTP environment variables with zero-crash local console fallback.
"""
import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

logger = logging.getLogger("lifeline.email")

def send_html_email(to_email: str, subject: str, html_body: str, text_body: str = "") -> bool:
    """
    Sends an HTML email using SMTP if configured; otherwise logs formatted email to server console.
    """
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", smtp_user or "noreply@lifeline-ai.com").strip()
    from_name = os.getenv("SMTP_FROM_NAME", "LifeLine AI").strip()

    # If SMTP is not yet configured, provide a rich console log for instant testing
    if not smtp_host or not smtp_user or not smtp_password:
        logger.info(
            f"\n"
            f"╔══════════════════════════════════════════════════════════════════════════════╗\n"
            f"║ LifeLine AI Email Service (Console Delivery Notice)                         ║\n"
            f"╠══════════════════════════════════════════════════════════════════════════════╣\n"
            f"║ To: {to_email:<71} ║\n"
            f"║ Subject: {subject:<66} ║\n"
            f"║ Note: Add SMTP_HOST, SMTP_USER, SMTP_PASSWORD in .env for live inbox delivery ║\n"
            f"╠══════════════════════════════════════════════════════════════════════════════╣\n"
            f"{text_body or html_body[:300]}\n"
            f"╚══════════════════════════════════════════════════════════════════════════════╝"
        )
        return True

    # Real SMTP Dispatch
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = to_email

        if text_body:
            msg.attach(MIMEText(text_body, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        if smtp_port == 465:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12)
        else:
            server = smtplib.SMTP(smtp_host, smtp_port, timeout=12)
            server.ehlo()
            server.starttls()
            server.ehlo()

        server.login(smtp_user, smtp_password)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        logger.info(f"Successfully dispatched live email to {to_email} via SMTP ({smtp_host})")
        return True
    except Exception as err:
        logger.error(f"Failed to deliver SMTP email to {to_email}: {err}")
        return False


def send_welcome_email(to_email: str, user_name: str, role: str, blood_type: str = "N/A"):
    """
    Sends welcome & account activation email upon registration.
    """
    subject = f"Welcome to LifeLine AI — Your {role.title()} Account is Active"
    role_desc = (
        "You are now connected to Jaipur's real-time emergency dispatch network to receive algorithmic blood match alerts and save lives."
        if role.lower() == "donor"
        else "You can now broadcast emergency donor mobilizations and pull reserve stock directly from Regional Blood Banks."
    )

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #e11d48, #be123c); padding: 32px 28px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }}
        .header p {{ margin: 6px 0 0; opacity: 0.9; font-size: 13px; }}
        .content {{ padding: 32px 28px; }}
        .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
        .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }}
        .card-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
        .card-row:last-child {{ margin-bottom: 0; }}
        .label {{ color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
        .val {{ color: #0f172a; font-weight: 700; }}
        .badge {{ background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 12px; }}
        .footer {{ padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LifeLine AI</h1>
          <p>Real-time Algorithmic Emergency Blood Network</p>
        </div>
        <div class="content">
          <div class="greeting">Welcome to the network, {user_name}!</div>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Your account has been successfully created and verified. {role_desc}
          </p>
          <div class="card">
            <div class="card-row">
              <span class="label">Account Role:</span>
              <span class="val" style="text-transform: capitalize;">{role}</span>
            </div>
            <div class="card-row">
              <span class="label">Registered Email:</span>
              <span class="val">{to_email}</span>
            </div>
            {f'''<div class="card-row">
              <span class="label">Blood Group:</span>
              <span class="badge">{blood_type}</span>
            </div>''' if role.lower() == "donor" else ""}
            <div class="card-row">
              <span class="label">Status:</span>
              <span class="val" style="color: #059669;">● Active & Ready</span>
            </div>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #64748b;">
            To access your console, sign in at any time with your credentials. If you have any inquiries, contact our emergency logistics team.
          </p>
        </div>
        <div class="footer">
          &copy; {datetime.utcnow().year} LifeLine AI Logistics Hub. All rights reserved.
        </div>
      </div>
    </body>
    </html>
    """

    text = f"Welcome to LifeLine AI, {user_name}!\n\nYour {role} account ({to_email}) is now active.\n{role_desc}\n\nLogin to start dispatching or standby for match alerts."
    return send_html_email(to_email, subject, html, text)


def send_password_reset_email(to_email: str, user_name: str, reset_code: str):
    """
    Sends 6-digit password reset verification code email.
    """
    subject = "LifeLine AI — Password Reset Verification Code"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }}
        .header {{ background: #0f172a; padding: 28px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; }}
        .content {{ padding: 32px 28px; text-align: center; }}
        .code-box {{ margin: 24px auto; background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 18px 24px; font-family: 'Courier New', monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #be123c; width: fit-content; }}
        .notice {{ font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 20px; }}
        .footer {{ padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>LifeLine AI Security</h1>
        </div>
        <div class="content">
          <p style="font-size: 15px; color: #334155; margin-bottom: 8px;">Hello {user_name},</p>
          <p style="font-size: 14px; color: #475569; line-height: 1.5;">
            We received a request to reset the password for your LifeLine AI account. Enter the following verification code to proceed:
          </p>
          <div class="code-box">{reset_code}</div>
          <p style="font-size: 12px; font-weight: 600; color: #e11d48;">
            ⏱ This code expires in 15 minutes.
          </p>
          <p class="notice">
            If you did not request this password reset, you can safely ignore this email. Your current password remains secure.
          </p>
        </div>
        <div class="footer">
          &copy; {datetime.utcnow().year} LifeLine AI Security Services.
        </div>
      </div>
    </body>
    </html>
    """

    text = f"Hello {user_name},\n\nYour LifeLine AI password reset verification code is: {reset_code}\n\nThis code expires in 15 minutes. If you did not request this, please ignore this email."
    return send_html_email(to_email, subject, html, text)


def send_password_changed_confirmation_email(to_email: str, user_name: str):
    """
    Sends confirmation email after password has been successfully reset.
    """
    subject = "LifeLine AI — Password Changed Successfully"
    time_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }}
        .header {{ background: #059669; padding: 24px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 20px; font-weight: 800; }}
        .content {{ padding: 32px 28px; }}
        .footer {{ padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Security Update</h1>
        </div>
        <div class="content">
          <p style="font-size: 15px; font-weight: 700; color: #0f172a;">Password Updated</p>
          <p style="font-size: 13px; color: #334155; line-height: 1.6;">
            Hello {user_name}, this is a confirmation that the password for your LifeLine AI account ({to_email}) was successfully changed on <strong>{time_str}</strong>.
          </p>
          <p style="font-size: 12px; color: #64748b; line-height: 1.5; margin-top: 16px;">
            You can now sign in using your new credentials. If you did NOT make this change, please contact your administrator or reply immediately to lock your account.
          </p>
        </div>
        <div class="footer">
          &copy; {datetime.utcnow().year} LifeLine AI Security Services.
        </div>
      </div>
    </body>
    </html>
    """

    text = f"Hello {user_name},\n\nYour LifeLine AI password was successfully changed on {time_str}.\nIf you did not make this change, please contact support immediately."
    return send_html_email(to_email, subject, html, text)


def send_appointment_confirmation_email(to_email: str, donor_name: str, facility_name: str, blood_type: str, ticket_id: str):
    """
    Sends appointment confirmation email when a donor schedules a voluntary donation appointment.
    """
    subject = f"LifeLine AI — Donation Appointment Confirmed ({ticket_id})"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #e11d48, #be123c); padding: 30px 28px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; }}
        .header p {{ margin: 6px 0 0; opacity: 0.9; font-size: 13px; }}
        .content {{ padding: 32px 28px; }}
        .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
        .card {{ background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }}
        .card-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
        .card-row:last-child {{ margin-bottom: 0; }}
        .label {{ color: #64748b; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
        .val {{ color: #0f172a; font-weight: 700; }}
        .badge {{ background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 12px; }}
        .ticket {{ background: #eff6ff; color: #1d4ed8; border: 1px dashed #93c5fd; padding: 6px 12px; border-radius: 8px; font-family: monospace; font-weight: 700; font-size: 13px; text-align: center; margin-top: 10px; }}
        .footer {{ padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Donation Appointment Confirmed</h1>
          <p>LifeLine AI Logistics Network</p>
        </div>
        <div class="content">
          <div class="greeting">Dear {donor_name},</div>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Thank you for stepping forward! Your appointment to donate blood has been officially registered and queued in the facility intake roster.
          </p>
          <div class="card">
            <div class="card-row">
              <span class="label">Appointment Ticket:</span>
              <span class="val font-mono">{ticket_id}</span>
            </div>
            <div class="card-row">
              <span class="label">Facility / Blood Bank:</span>
              <span class="val">{facility_name}</span>
            </div>
            <div class="card-row">
              <span class="label">Donor Blood Group:</span>
              <span class="badge">{blood_type}</span>
            </div>
            <div class="card-row">
              <span class="label">Status:</span>
              <span class="val" style="color: #2563eb;">● Scheduled for Intake</span>
            </div>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #475569;">
            <strong>Intake Procedure:</strong> When you arrive at {facility_name}, show your Ticket ID <strong>{ticket_id}</strong> at the intake desk. Once the screening and donation are complete, staff will verify your donation in the portal to credit +50 points and 1 life saved to your profile!
          </p>
        </div>
        <div class="footer">
          &copy; {datetime.utcnow().year} LifeLine AI Emergency Logistics.
        </div>
      </div>
    </body>
    </html>
    """

    text = f"Dear {donor_name},\n\nYour donation appointment at {facility_name} has been confirmed.\nTicket ID: {ticket_id}\nBlood Group: {blood_type}\n\nPlease present this ticket at the intake desk upon arrival."
    return send_html_email(to_email, subject, html, text)


def send_donation_completed_email(to_email: str, donor_name: str, facility_name: str, blood_type: str, points_awarded: int = 50):
    """
    Sends thank you & verification email when a donor's donation is completed by facility intake staff.
    """
    subject = f"LifeLine AI — Blood Donation Verified & Processed (+{points_awarded} Points)"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }}
        .container {{ max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0,0,0,0.05); }}
        .header {{ background: linear-gradient(135deg, #059669, #047857); padding: 30px 28px; text-align: center; color: #ffffff; }}
        .header h1 {{ margin: 0; font-size: 22px; font-weight: 800; }}
        .header p {{ margin: 6px 0 0; opacity: 0.9; font-size: 13px; }}
        .content {{ padding: 32px 28px; }}
        .greeting {{ font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }}
        .card {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 18px; margin: 20px 0; }}
        .card-row {{ display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 13px; }}
        .card-row:last-child {{ margin-bottom: 0; }}
        .label {{ color: #166534; font-weight: 600; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px; }}
        .val {{ color: #0f172a; font-weight: 700; }}
        .badge {{ background: #dcfce7; color: #15803d; padding: 2px 8px; border-radius: 6px; font-weight: 800; font-size: 12px; }}
        .footer {{ padding: 20px 28px; background: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 11px; color: #94a3b8; }}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Thank You for Saving a Life!</h1>
          <p>Donation Intake Verified & Added to Reserve</p>
        </div>
        <div class="content">
          <div class="greeting">Hero of the Day: {donor_name}!</div>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Your voluntary blood donation at <strong>{facility_name}</strong> has been successfully verified, tested, and added to the cold chain reserve!
          </p>
          <div class="card">
            <div class="card-row">
              <span class="label">Receiving Facility:</span>
              <span class="val">{facility_name}</span>
            </div>
            <div class="card-row">
              <span class="label">Blood Units Added:</span>
              <span class="val" style="color: #059669;">+1 Unit ({blood_type})</span>
            </div>
            <div class="card-row">
              <span class="label">Points Awarded:</span>
              <span class="badge">+{points_awarded} Points</span>
            </div>
            <div class="card-row">
              <span class="label">Direct Impact:</span>
              <span class="val" style="color: #e11d48;">+1 Life Protected</span>
            </div>
            <div class="card-row">
              <span class="label">Status:</span>
              <span class="val" style="color: #059669;">● Verified & Active</span>
            </div>
          </div>
          <p style="font-size: 13px; line-height: 1.5; color: #475569;">
            Your life points and contribution rank on the LifeLine Leaderboard have been updated. On behalf of the emergency trauma network and hospital patients in Jaipur, thank you!
          </p>
        </div>
        <div class="footer">
          &copy; {datetime.utcnow().year} LifeLine AI Emergency Logistics.
        </div>
      </div>
    </body>
    </html>
    """

    text = f"Hero of the Day: {donor_name}!\n\nYour blood donation at {facility_name} has been verified.\n+1 Unit ({blood_type}) added to reserve.\n+{points_awarded} points awarded to your donor profile.\n\nThank you for saving lives!"
    return send_html_email(to_email, subject, html, text)
