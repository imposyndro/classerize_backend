/**
 * emailService.js
 * Sends transactional emails via SendGrid.
 * Set SENDGRID_API_KEY and EMAIL_FROM in .env.
 */

const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM = process.env.EMAIL_FROM || 'noreply@classerize.app';

/**
 * Send a deadline alert for a single assignment.
 */
const sendDeadlineAlert = async ({ to, username, assignmentName, courseName, dueDate }) => {
    const formattedDue = new Date(dueDate).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });

    const msg = {
        to,
        from: FROM,
        subject: `Reminder: "${assignmentName}" is due soon`,
        text: `Hi ${username},\n\nThis is a reminder that "${assignmentName}" (${courseName}) is due on ${formattedDue}.\n\nLog in to Classerize to track your progress.\n\n— Classerize`,
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #2563EB;">Assignment Reminder</h2>
                <p>Hi <strong>${username}</strong>,</p>
                <p>This is a reminder that <strong>"${assignmentName}"</strong> (<em>${courseName}</em>) is due on:</p>
                <p style="font-size: 1.1em; font-weight: bold; color: #DC2626;">${formattedDue}</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/assignments"
                   style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2563EB;color:#fff;border-radius:6px;text-decoration:none;">
                    View Assignments
                </a>
                <p style="margin-top:24px;color:#9CA3AF;font-size:0.85em;">
                    — Classerize | <a href="${process.env.FRONTEND_URL}/settings">Manage notification settings</a>
                </p>
            </div>`,
    };

    await sgMail.send(msg);
};

/**
 * Send a daily digest summarizing upcoming assignments.
 */
const sendDailyDigest = async ({ to, username, assignments }) => {
    if (!assignments.length) return;

    const listHtml = assignments
        .slice(0, 10)
        .map((a) => {
            const due = a.due_date ? new Date(a.due_date).toLocaleDateString() : 'No due date';
            return `<li><strong>${a.assignment_name}</strong> — ${a.course_name || ''} — Due: ${due}</li>`;
        })
        .join('');

    const msg = {
        to,
        from: FROM,
        subject: `Your Classerize daily digest — ${new Date().toLocaleDateString()}`,
        text: `Hi ${username},\n\nHere are your upcoming assignments:\n\n${assignments.slice(0,10).map(a => `- ${a.assignment_name} (${a.course_name}): due ${a.due_date ? new Date(a.due_date).toLocaleDateString() : 'N/A'}`).join('\n')}\n\n— Classerize`,
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2 style="color: #2563EB;">Daily Digest</h2>
                <p>Hi <strong>${username}</strong>, here are your upcoming assignments:</p>
                <ul style="padding-left: 1.25rem;">${listHtml}</ul>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/assignments"
                   style="display:inline-block;margin-top:16px;padding:10px 20px;background:#2563EB;color:#fff;border-radius:6px;text-decoration:none;">
                    View All
                </a>
                <p style="margin-top:24px;color:#9CA3AF;font-size:0.85em;">
                    — Classerize | <a href="${process.env.FRONTEND_URL}/settings">Manage notification settings</a>
                </p>
            </div>`,
    };

    await sgMail.send(msg);
};

module.exports = { sendDeadlineAlert, sendDailyDigest };
