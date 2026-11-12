"""Sends the two emails for every service request through Brevo's HTTPS API.
(Render's free plan blocks SMTP ports, so Gmail SMTP will NOT work there; an HTTP API does.)"""
import os, html, logging
import httpx

log = logging.getLogger("assistant")

API_KEY     = os.getenv("BREVO_API_KEY", "")
MAIL_FROM   = os.getenv("MAIL_FROM", "bmuthuraj2002@gmail.com")      # must be a verified sender in Brevo
MAIL_NAME   = os.getenv("MAIL_FROM_NAME", "Pearl-TechLab")
OWNER_EMAIL = os.getenv("OWNER_EMAIL", "bmuthuraj2002@gmail.com")
SITE_URL    = os.getenv("SITE_URL", "https://pearltechlab.onrender.com").rstrip("/")
LOGO_URL    = os.getenv("LOGO_URL", SITE_URL + "/images/Face-PTS.png")  # emails need a full public URL
WA_ICON_URL = os.getenv("WA_ICON_URL", SITE_URL + "/images/whatsapp-icon.png")  # upload images/whatsapp-icon.png to your site
WA_NUMBER   = os.getenv("WHATSAPP_NUMBER", "918248978489")               # country code + number, digits only
WA_DISPLAY  = os.getenv("WHATSAPP_DISPLAY", "+91 82489 78489")
WA_LINK     = f"https://wa.me/{WA_NUMBER}?text=Hi%20Muthuraj%2C%20I%20sent%20a%20service%20request%20on%20your%20website."

def _e(s):  # escape + keep line breaks
    return html.escape(str(s or "")).replace("\n", "<br>")

def _send(to_email, to_name, subject, html_body, reply_to=None, reply_name=None):
    if not API_KEY:
        raise RuntimeError("BREVO_API_KEY is not set")
    payload = {
        "sender": {"name": MAIL_NAME, "email": MAIL_FROM},
        "to": [{"email": to_email, "name": to_name or to_email}],
        "subject": subject,
        "htmlContent": html_body,
    }
    if reply_to:
        payload["replyTo"] = {"email": reply_to, "name": reply_name or reply_to}
    r = httpx.post("https://api.brevo.com/v3/smtp/email", json=payload, timeout=20,
                   headers={"api-key": API_KEY, "accept": "application/json"})
    r.raise_for_status()

def _owner_html(r):
    rows = [("Name", r["name"]), ("Email", r["email"]), ("Phone", r["phone"] or "-"),
            ("Category", r["service_category"]), ("Service", r["service"]), ("Requirements", r["requirements"])]
    tr = "".join(
        f'<tr><td style="padding:10px 14px;background:#f4f4f8;font-weight:600;width:140px;vertical-align:top;border-bottom:1px solid #e6e6ee">{_e(k)}</td>'
        f'<td style="padding:10px 14px;border-bottom:1px solid #e6e6ee">{_e(v)}</td></tr>' for k, v in rows)
    return f"""<div style="font-family:Arial,Helvetica,sans-serif;max-width:620px;margin:auto;color:#1b1b22">
<h2 style="margin:0 0 6px">New service request #{r['id']}</h2>
<p style="margin:0 0 16px;color:#666">Received from your website. Just hit <b>Reply</b> to answer the client directly.</p>
<table style="width:100%;border-collapse:collapse;border:1px solid #e6e6ee;border-radius:8px">{tr}</table></div>"""

def _user_html(r):
    return f"""<div style="background:#f4f4f8;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e6e6ee">
  <div style="background:#141416;padding:26px;text-align:center">
    <img src="{_e(LOGO_URL)}" alt="Pearl-TechLab" width="84" height="84" style="border-radius:50%;background:#1c1c20;padding:6px;display:inline-block">
    <div style="color:#ffffff;font-size:18px;font-weight:700;margin-top:10px">Pearl-TechLab</div>
  </div>
  <div style="padding:28px 30px;color:#1b1b22;line-height:1.6;font-size:15px">
    <h2 style="margin:0 0 12px;font-size:20px">Thank you for your request, {_e(r['name'])}!</h2>
    <p style="margin:0 0 14px">I have received your request for <b>{_e(r['service'])}</b> ({_e(r['service_category'])}).
    I will contact you soon to discuss your requirements and work out the best way to solve them.</p>
    <div style="background:#f4f4f8;border-radius:10px;padding:14px 16px;margin:18px 0">
      <div style="font-size:12px;letter-spacing:.6px;text-transform:uppercase;color:#777;margin-bottom:6px">Your requirements</div>
      <div>{_e(r['requirements'])}</div>
    </div>
    <p style="margin:0 0 4px">If you want to add anything, simply reply to this email.</p>
    <p style="margin:18px 0 12px">Thanks and regards,</p>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;font-family:Arial,Helvetica,sans-serif">
      <tr><td colspan="2" style="padding:0 0 2px;font-size:17px;font-weight:700;color:#1b1b22">Muthuraj</td></tr>
      <tr><td colspan="2" style="padding:0 0 2px;font-size:14px;font-weight:700;color:#555">AI Engineer &amp; Software Developer</td></tr>
      <tr><td colspan="2" style="padding:0 0 12px;font-size:13px;color:#777">Founder of <b style="color:#4f5bd5">Pearl Tech Software Solution</b></td></tr>
      <tr>
        <td width="30" style="padding:0 0 8px;vertical-align:middle"><a href="{_e(WA_LINK)}"><img src="{_e(WA_ICON_URL)}" alt="WhatsApp" width="22" height="22" style="display:block;border:0;border-radius:50%"></a></td>
        <td style="padding:0 0 8px;vertical-align:middle;font-size:14px"><a href="{_e(WA_LINK)}" style="color:#1b1b22;text-decoration:none;font-weight:600">{_e(WA_DISPLAY)}</a> <span style="color:#1faa59;font-size:12px">(WhatsApp)</span></td>
      </tr>
      <tr>
        <td width="30" style="padding:0;vertical-align:middle"><a href="{_e(SITE_URL)}"><img src="{_e(LOGO_URL)}" alt="Pearl-TechLab" width="22" height="22" style="display:block;border:0;border-radius:50%;background:#1c1c20"></a></td>
        <td style="padding:0;vertical-align:middle;font-size:14px"><a href="{_e(SITE_URL)}" style="color:#4f5bd5;text-decoration:none">{_e(SITE_URL.replace('https://',''))}</a></td>
      </tr>
    </table>
  </div>
</div></div>"""

def send_request_emails(r: dict):
    """Returns (owner_ok, user_ok). Each mail is independent: one failing never blocks the other."""
    owner_ok = user_ok = False
    try:
        _send(OWNER_EMAIL, "MuthuRaj", f"New request: {r['service']} from {r['name']}",
              _owner_html(r), reply_to=r["email"], reply_name=r["name"])
        owner_ok = True
    except Exception:
        log.exception("Owner notification email failed")
    try:
        _send(r["email"], r["name"], "Thank you for your request | Pearl-TechLab",
              _user_html(r), reply_to=OWNER_EMAIL, reply_name="MuthuRaj B")
        user_ok = True
    except Exception:
        log.exception("Auto-reply email to user failed")
    return owner_ok, user_ok
