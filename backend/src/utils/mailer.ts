import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logoPath = path.join(__dirname, "../../public/logo.png");
const logoBase64 = fs.existsSync(logoPath)
  ? `data:image/png;base64,${fs.readFileSync(logoPath).toString("base64")}`
  : "";
export const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST || "localhost",
  port: Number(process.env.MAIL_PORT) || 1025,
  secure: false,
  ignoreTLS: true,
});
export const sendMail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  return transporter.sendMail({
    from: process.env.MAIL_FROM || "snehacrest@gmail.com",
    to,
    subject,
    html,
  });
};
export const sendWelcomeEmail = async ({
  to,
  name,
  employeeId,
  department,
  position,
  email,
  password,
}: {
  to: string;
  name: string;
  employeeId: string;
  department: string;
  position: string | null;
  email: string;
  password: string;
}) => {
  return sendMail({
    to,
    subject: "Welcome to the Team! 🎉",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); border-radius: 16px 16px 0 0; padding: 48px 40px; text-align: center;">
            <img src="${logoBase64}" alt="Cubit" style="height: 56px; width: auto; margin-bottom: 20px;" />
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 28px; font-weight: 700;">Welcome to the Team, ${name}!</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 15px;">We're thrilled to have you at Cubit Incoorporated Pvt. Ltd.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 40px;">

              <p style="color: #374151; font-size: 15px; margin: 0 0 8px; line-height: 1.7;">
                Hi <strong>${name}</strong>,
              </p>
              <p style="color: #374151; font-size: 15px; margin: 0 0 32px; line-height: 1.7;">
                Your account is all set up and ready to go. You're joining the <strong>${department}</strong> team${position ? ` as <strong>${position}</strong> ` : ""}. We're so excited to have you on board!
                Your employeeId is <strong>${employeeId}</strong>
              </p>

              <!-- Credentials Box -->
              <div style="background: #F5F3FF; border: 2px solid #DDD6FE; border-radius: 14px; padding: 28px 32px; margin-bottom: 32px;">
                <p style="color: #5B21B6; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px;">🔐 Your Login Credentials</p>

                <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px;">Username</p>
                <p style="color: #1E1B4B; font-size: 16px; font-weight: 700; margin: 0 0 20px;">${email}</p>

                <p style="color: #6B7280; font-size: 13px; margin: 0 0 4px;">Temporary Password</p>
                <div style="background: #4F46E5; border-radius: 8px; padding: 12px 16px; display: inline-block;">
                  <code style="color: #ffffff; font-size: 18px; font-weight: 700; letter-spacing: 2px;">${password}</code>
                </div>
              </div>

              <!-- Warning -->
              <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 4px; padding: 14px 18px; margin-bottom: 32px;">
                <p style="color: #92400E; font-size: 13px; margin: 0; line-height: 1.6;">
                  ⚠️ <strong>You will be prompted to change your password</strong> on your first login. Please keep your credentials safe.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align: center;">
                <a href="http://localhost:5173/login" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 15px; font-weight: 600;">
                  Login Now →
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #F9FAFB; border-top: 1px solid #E5E7EB; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 4px;">This is an automated message from HarmonyHR.</p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">If you didn't expect this, please contact your HR administrator.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  });
};
export const sendLeaveApprovedEmail = async ({
  to,
  name,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reason,
  approvedBy,
}: {
  to: string;
  name: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  approvedBy: string;
}) => {
  const appUrl = process.env.APP_URL || "http://localhost:5173";

  return sendMail({
    to,
    subject: "✅ Your Leave Request Has Been Approved",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #059669 0%, #047857 100%); border-radius: 16px 16px 0 0; padding: 48px 40px; text-align: center;">
              <img src="${logoBase64}" alt="Cubit" style="height: 56px; width: auto; margin-bottom: 20px;" />
              <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 64px; height: 64px; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center; font-size: 32px;">✅</div>
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 26px; font-weight: 700;">Leave Approved!</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 15px;">Your leave request has been approved.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 40px;">
              <p style="color: #374151; font-size: 15px; margin: 0 0 24px; line-height: 1.7;">
                Hi <strong>${name}</strong>, your leave request has been reviewed and approved. Here are the details:
              </p>

              <!-- Leave Details Box -->
              <div style="background: #F0FDF4; border: 2px solid #BBF7D0; border-radius: 14px; padding: 28px 32px; margin-bottom: 32px;">
                <p style="color: #166534; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px;">📋 Leave Details</p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 14px; width: 45%;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Leave Type</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${leaveType}</p>
                    </td>
                    <td style="padding-bottom: 14px;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Duration</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${totalDays} day${totalDays > 1 ? "s" : ""}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 14px;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Start Date</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${startDate}</p>
                    </td>
                    <td style="padding-bottom: 14px;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">End Date</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${endDate}</p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Approved By</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${approvedBy}</p>
                    </td>
                  </tr>
                  ${
                    reason
                      ? `
                  <tr>
                    <td colspan="2" style="padding-top: 14px; border-top: 1px solid #D1FAE5;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Your Reason</p>
                      <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">${reason}</p>
                    </td>
                  </tr>`
                      : ""
                  }
                </table>
              </div>

              <!-- Info note -->
              <div style="background: #EFF6FF; border-left: 4px solid #3B82F6; border-radius: 4px; padding: 14px 18px; margin-bottom: 32px;">
                <p style="color: #1E40AF; font-size: 13px; margin: 0; line-height: 1.6;">
                  ℹ️ Please ensure you complete any pending handovers before your leave begins.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align: center;">
                <a href="${appUrl}/leave" style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 15px; font-weight: 600;">
                  View My Leaves →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #F9FAFB; border-top: 1px solid #E5E7EB; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 4px;">This is an automated message from HarmonyHR.</p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">If you have questions, please contact your HR administrator.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
};

export const sendLeaveRejectedEmail = async ({
  to,
  name,
  leaveType,
  startDate,
  endDate,
  totalDays,
  reason,
  rejectedBy,
  rejectionReason,
}: {
  to: string;
  name: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  rejectedBy: string;
  rejectionReason?: string;
}) => {
  const appUrl = process.env.APP_URL || "http://localhost:5173";

  return sendMail({
    to,
    subject: "❌ Your Leave Request Has Been Rejected",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background-color:#F3F4F6; font-family: 'Segoe UI', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#F3F4F6; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px; width:100%;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); border-radius: 16px 16px 0 0; padding: 48px 40px; text-align: center;">
              <img src="${logoBase64}" alt="Cubit" style="height: 56px; width: auto; margin-bottom: 20px;" />
              <div style="font-size: 40px; margin-bottom: 16px;">❌</div>
              <h1 style="color: #ffffff; margin: 0 0 8px; font-size: 26px; font-weight: 700;">Leave Not Approved</h1>
              <p style="color: rgba(255,255,255,0.85); margin: 0; font-size: 15px;">Your leave request could not be approved at this time.</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background: #ffffff; padding: 40px;">
              <p style="color: #374151; font-size: 15px; margin: 0 0 24px; line-height: 1.7;">
                Hi <strong>${name}</strong>, unfortunately your leave request has been reviewed and was not approved. Here are the details:
              </p>

              <!-- Leave Details Box -->
              <div style="background: #FFF5F5; border: 2px solid #FECACA; border-radius: 14px; padding: 28px 32px; margin-bottom: 24px;">
                <p style="color: #991B1B; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 20px;">📋 Leave Details</p>

                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-bottom: 14px; width: 45%;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Leave Type</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${leaveType}</p>
                    </td>
                    <td style="padding-bottom: 14px;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Duration</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${totalDays} day${totalDays > 1 ? "s" : ""}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 14px;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Start Date</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${startDate}</p>
                    </td>
                    <td style="padding-bottom: 14px;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">End Date</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${endDate}</p>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Reviewed By</p>
                      <p style="color: #111827; font-size: 15px; font-weight: 600; margin: 0;">${rejectedBy}</p>
                    </td>
                  </tr>
                  ${
                    reason
                      ? `
                  <tr>
                    <td colspan="2" style="padding-top: 14px; border-top: 1px solid #FECACA;">
                      <p style="color: #6B7280; font-size: 12px; margin: 0 0 3px; text-transform: uppercase; letter-spacing: 0.5px;">Your Reason</p>
                      <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">${reason}</p>
                    </td>
                  </tr>`
                      : ""
                  }
                </table>
              </div>

              ${
                rejectionReason
                  ? `
              <!-- Rejection Reason -->
              <div style="background: #FEF2F2; border: 2px solid #FECACA; border-radius: 10px; padding: 20px 24px; margin-bottom: 32px;">
                <p style="color: #991B1B; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">💬 Reason for Rejection</p>
                <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">${rejectionReason}</p>
              </div>`
                  : ""
              }

              <!-- Encouragement note -->
              <div style="background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 4px; padding: 14px 18px; margin-bottom: 32px;">
                <p style="color: #92400E; font-size: 13px; margin: 0; line-height: 1.6;">
                  💡 You may re-apply for a different date range or reach out to your manager for more information.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align: center;">
                <a href="${appUrl}/leave" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 15px; font-weight: 600;">
                  Apply Again →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #F9FAFB; border-top: 1px solid #E5E7EB; border-radius: 0 0 16px 16px; padding: 24px 40px; text-align: center;">
              <p style="color: #9CA3AF; font-size: 12px; margin: 0 0 4px;">This is an automated message from HarmonyHR.</p>
              <p style="color: #9CA3AF; font-size: 12px; margin: 0;">If you have questions, please contact your HR administrator.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  });
};
