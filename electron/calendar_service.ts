import { Notification } from 'electron';
import { getMemoryDb } from './memory';

export interface CalendarEvent {
  id?: number;
  title: string;
  description?: string;
  startTime: string; // ISO 8601 (e.g. 2026-09-27T15:00:00) or YYYY-MM-DD HH:mm
  endTime?: string;
  attendees?: string; // Comma-separated or names/emails
  reminderMinutes?: number;
  notified?: number;
  created_at?: string;
}

export class CalendarService {
  private static instance: CalendarService;
  private reminderTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.startReminderWorker();
  }

  public static getInstance(): CalendarService {
    if (!CalendarService.instance) {
      CalendarService.instance = new CalendarService();
    }
    return CalendarService.instance;
  }

  public createEvent(event: CalendarEvent): { success: boolean; message: string; eventId?: number } {
    try {
      const db = getMemoryDb();
      const stmt = db.prepare(`
        INSERT INTO calendar_events (title, description, start_time, end_time, attendees, reminder_minutes, notified)
        VALUES (@title, @description, @start_time, @end_time, @attendees, @reminder_minutes, 0)
      `);

      const result = stmt.run({
        title: event.title,
        description: event.description || '',
        start_time: event.startTime,
        end_time: event.endTime || '',
        attendees: event.attendees || '',
        reminder_minutes: event.reminderMinutes !== undefined ? event.reminderMinutes : 15,
      });

      const eventId = Number(result.lastInsertRowid);
      console.log(`[CalendarService] Created event "${event.title}" with ID ${eventId}`);

      return {
        success: true,
        message: `Successfully scheduled "${event.title}" for ${event.startTime}. (Event ID: ${eventId})`,
        eventId,
      };
    } catch (err: any) {
      console.error('[CalendarService] Failed to create event:', err);
      return {
        success: false,
        message: `Failed to create event: ${err.message}`,
      };
    }
  }

  public listEvents(options: { dateFilter?: 'today' | 'upcoming' | 'all'; limit?: number } = {}): {
    success: boolean;
    events: any[];
    message: string;
  } {
    try {
      const db = getMemoryDb();
      const filter = options.dateFilter || 'upcoming';
      const limit = options.limit || 10;
      const now = new Date();
      const nowIso = now.toISOString();
      const todayDateStr = nowIso.slice(0, 10); // YYYY-MM-DD

      let rows: any[] = [];

      if (filter === 'today') {
        const stmt = db.prepare(`
          SELECT id, title, description, start_time, end_time, attendees, reminder_minutes
          FROM calendar_events
          WHERE start_time LIKE ?
          ORDER BY start_time ASC
          LIMIT ?
        `);
        rows = stmt.all(`${todayDateStr}%`, limit);
      } else if (filter === 'upcoming') {
        const stmt = db.prepare(`
          SELECT id, title, description, start_time, end_time, attendees, reminder_minutes
          FROM calendar_events
          WHERE start_time >= ?
          ORDER BY start_time ASC
          LIMIT ?
        `);
        rows = stmt.all(todayDateStr, limit);
      } else {
        const stmt = db.prepare(`
          SELECT id, title, description, start_time, end_time, attendees, reminder_minutes
          FROM calendar_events
          ORDER BY start_time DESC
          LIMIT ?
        `);
        rows = stmt.all(limit);
      }

      const formatted = rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        startTime: r.start_time,
        endTime: r.end_time,
        attendees: r.attendees,
        reminderMinutes: r.reminder_minutes,
      }));

      return {
        success: true,
        events: formatted,
        message: `Found ${formatted.length} event(s) for filter "${filter}".`,
      };
    } catch (err: any) {
      console.error('[CalendarService] Failed to list events:', err);
      return {
        success: false,
        events: [],
        message: `Failed to list events: ${err.message}`,
      };
    }
  }

  public deleteEvent(target: string | number): { success: boolean; message: string } {
    try {
      const db = getMemoryDb();
      let stmt;
      if (typeof target === 'number' || !isNaN(Number(target))) {
        stmt = db.prepare(`DELETE FROM calendar_events WHERE id = ?`);
        const result = stmt.run(Number(target));
        if (result.changes > 0) {
          return { success: true, message: `Event ID ${target} deleted successfully.` };
        }
      }

      stmt = db.prepare(`DELETE FROM calendar_events WHERE title LIKE ?`);
      const result = stmt.run(`%${target}%`);
      if (result.changes > 0) {
        return { success: true, message: `Deleted ${result.changes} event(s) matching "${target}".` };
      }

      return { success: false, message: `No event found matching "${target}".` };
    } catch (err: any) {
      console.error('[CalendarService] Failed to delete event:', err);
      return { success: false, message: `Failed to delete event: ${err.message}` };
    }
  }

  public checkDueReminders() {
    try {
      const db = getMemoryDb();
      const now = new Date();
      // Look for unnotified events scheduled within the next 24 hours
      const stmt = db.prepare(`
        SELECT id, title, description, start_time, reminder_minutes
        FROM calendar_events
        WHERE notified = 0
      `);
      const unnotified = stmt.all() as any[];

      for (const event of unnotified) {
        const eventStart = new Date(event.start_time).getTime();
        if (isNaN(eventStart)) continue;

        const reminderWindowMs = (event.reminder_minutes || 15) * 60 * 1000;
        const nowMs = now.getTime();
        const diff = eventStart - nowMs;

        // If event is within reminder window (and hasn't expired more than 10 mins ago)
        if (diff <= reminderWindowMs && diff >= -10 * 60 * 1000) {
          const minutesLeft = Math.max(0, Math.round(diff / 60000));
          console.log(`[CalendarService] Triggering reminder for "${event.title}" (${minutesLeft} mins left)`);

          if (Notification.isSupported()) {
            new Notification({
              title: `📅 Elyra Reminder: ${event.title}`,
              body: minutesLeft === 0 
                ? `Event starting now! ${event.description || ''}`
                : `Upcoming in ${minutesLeft} minute(s). ${event.description || ''}`,
            }).show();
          }

          db.prepare(`UPDATE calendar_events SET notified = 1 WHERE id = ?`).run(event.id);
        }
      }
    } catch (e) {
      console.error('[CalendarService] Reminder check failed:', e);
    }
  }

  public startReminderWorker() {
    if (this.reminderTimer) return;
    // Check reminders every 60 seconds
    this.reminderTimer = setInterval(() => {
      this.checkDueReminders();
    }, 60000);
  }

  public stopReminderWorker() {
    if (this.reminderTimer) {
      clearInterval(this.reminderTimer);
      this.reminderTimer = null;
    }
  }
}
