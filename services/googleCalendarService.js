/**
 * googleCalendarService.js — Phase 4
 *
 * Reads events from a user's Google Calendar and pushes Classerize
 * assignment due dates into it.
 *
 * Requires the calendar scope: https://www.googleapis.com/auth/calendar
 * Users must grant this scope during Google SSO or via Settings → Connected Services.
 */

const { google } = require('googleapis');

class GoogleCalendarService {
    /**
     * @param {string} accessToken   Decrypted Google OAuth2 access token
     * @param {string} refreshToken  Decrypted refresh token (if available)
     */
    constructor(accessToken, refreshToken = null) {
        const auth = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        );
        auth.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken || undefined,
        });
        this.calendar = google.calendar({ version: 'v3', auth });
    }

    /**
     * List events from the user's primary calendar.
     * @param {Date} timeMin
     * @param {Date} timeMax
     */
    async listEvents(timeMin = new Date(), timeMax = null) {
        const params = {
            calendarId: 'primary',
            timeMin: timeMin.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults: 250,
        };
        if (timeMax) params.timeMax = timeMax.toISOString();

        const res = await this.calendar.events.list(params);
        return res.data.items || [];
    }

    /**
     * Create a calendar event for an assignment due date.
     * Returns the created event's Google Calendar ID (stored in calendar_events.external_id).
     */
    async createEvent({ summary, description, dueDate }) {
        const start = new Date(dueDate);
        const end = new Date(start.getTime() + 60 * 60 * 1000); // 1h block

        const res = await this.calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary,
                description,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
                source: {
                    title: 'Classerize',
                    url: process.env.FRONTEND_URL || 'http://localhost:3001',
                },
            },
        });
        return res.data.id;
    }

    /**
     * Update an existing event (e.g., assignment due date changed).
     */
    async updateEvent(googleEventId, { summary, description, dueDate }) {
        const start = new Date(dueDate);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        await this.calendar.events.patch({
            calendarId: 'primary',
            eventId: googleEventId,
            requestBody: {
                summary,
                description,
                start: { dateTime: start.toISOString() },
                end: { dateTime: end.toISOString() },
            },
        });
    }

    /**
     * Delete an event (e.g., assignment was removed from LMS).
     */
    async deleteEvent(googleEventId) {
        await this.calendar.events.delete({
            calendarId: 'primary',
            eventId: googleEventId,
        });
    }
}

module.exports = GoogleCalendarService;
