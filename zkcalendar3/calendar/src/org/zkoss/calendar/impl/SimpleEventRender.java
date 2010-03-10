/* SimpleEventDrawer.java

{{IS_NOTE
	Purpose:
		
	Description:
		
	History:
		Mar 16, 2009 3:14:25 PM , Created by jumperchen
}}IS_NOTE

Copyright (C) 2009 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
}}IS_RIGHT
*/
package org.zkoss.calendar.impl;

import java.io.Serializable;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

import org.zkoss.calendar.Calendars;
import org.zkoss.calendar.api.CalendarEvent;
import org.zkoss.calendar.api.DateFormatter;
import org.zkoss.calendar.api.EventRender;
import org.zkoss.lang.Strings;
import org.zkoss.util.Locales;
import org.zkoss.xml.XMLs;


/**
 * A simple implementation of {@link EventRender}.
 * @author jumperchen
 *
 */
public class SimpleEventRender implements EventRender, Serializable {
	private static final long serialVersionUID = 1L;
	
	/** 
	 * This method is missing in {@link XMLs}, unfortunatelly. 
	 * @param sb String Buffer where to write to.
	 * @param s String to escape.
	 * 
	 * @return {@code sb} parameter.
	 * 
	 * @see XMLs#escapeXML(char)
	 */
	public static StringBuffer escapeXML(StringBuffer sb, String s) {
		if (s == null) return sb; // nothing to do
		
		for (int j = 0, len = s.length(); j < len; ++j) {
			final char cc = s.charAt(j);
			final String esc = XMLs.escapeXML(cc);
			if (esc != null) sb.append(esc);
			else sb.append(cc);
		}
		
		return sb;
	}
	public String drawDay(Calendars cal, CalendarEvent self, String id) {
		final String headerColor = self.getHeaderColor();
		final String contentColor = self.getContentColor();
		final String headerStyle = Strings.isBlank(headerColor) ? "" : " style=\"background:" + headerColor + "\"";
		final String contentStyle = Strings.isBlank(contentColor) ? "" : " style=\"background:" + contentColor + "\"";

		final Date eventBegin = self.getBeginDate();
		final Date eventEnd = self.getEndDate();

		// CSS ClassName
		final String zcls = self.getZclass();
		final String header = zcls + "-header";
		final String body = zcls + "-body";
		final String inner = zcls + "-inner";
		final String content = zcls + "-cnt";
		final String text = zcls + "-text";
		final String resizer = zcls + "-resizer";
		final String resizer_icon = resizer + "-icon";

		// round corner
		final String t1 = zcls + "-t1";
		final String t2 = zcls + "-t2";
		final String t3 = zcls + "-t3";
		final String b1 = zcls + "-b1";
		final String b2 = zcls + "-b2";
		final String b3 = zcls + "-b3";
		StringBuffer wh = new StringBuffer();
		wh.append("<div id=\"").append(id).append("\" z.type=\"Calevent\" class=\"").append(zcls).append("\"");
		wh.append(" z.zcls=\"").append(zcls).append("\"");
		wh.append(" z.bd=\"").append(eventBegin.getTime()).append("\"");
		wh.append(" z.ed=\"").append(eventEnd.getTime()).append("\"");
		if (self.isLocked())
			wh.append(" z.locked=\"true\"");

		wh.append(">");

		wh.append("<div class=\"")
				.append(t1)
				.append("\"")
				.append(headerStyle)
				.append("></div><div class=\"")
				.append(t2)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(t3)
				.append("\"></div></div>");

		// body
		wh.append("<div id=\"")
				.append(id)
				.append("!body\" class=\"")
				.append(body)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(inner)
				.append("\"")
				.append(headerStyle)
				.append(">");

		// header
		String title = self.getTitle();
		
		if (Strings.isEmpty(title)) {
			DateFormatter df = cal.getDateFormatter();
			Locale locale = Locales.getCurrent();
			TimeZone timezone = cal.getDefaultTimeZone();
			Date begin = self.getBeginDate();
			Date end = self.getEndDate();
			if (end.getTime() - begin.getTime() < 60*60*1000) {
				title = df.getCaptionByTimeOfDay(begin, locale, timezone)
					+ " - " + self.getContent();
			} else 
				title = df.getCaptionByTimeOfDay(begin, locale, timezone)
					+ " - " + df.getCaptionByTimeOfDay(end, locale, timezone);			
		}
		// title
		wh.append("<dl id=\"")
				.append(id)
				.append("!inner\"")
				.append(contentStyle)
				.append("><dt id=\"")
				.append(id)
				.append("!hd\" class=\"")
				.append(header)
				.append("\"")
				.append(headerStyle)
				.append(">")
				.append(title)
				.append("</dt>");

		// content
		wh.append("<dd id=\"")
				.append(id)
				.append("!cnt\" class=\"")
				.append(content)
				.append("\"")
				.append(contentStyle)
				.append("><div class=\"")
				.append(text)
				.append("\">");
		escapeXML(wh, self.getContent()).append("</div></dd>");

		// resizer
		if (!self.isLocked())
		wh.append("<div class=\"").append(resizer).append("\"><div class=\"")
			.append(resizer_icon).append("\"></div></div>");
		
		wh.append("</dl>");

		// the end of body		
		wh.append("</div></div>");

		wh.append("<div class=\"")
				.append(b2)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(b3)
				.append("\"></div></div><div class=\"")
				.append(b1)
				.append("\"")
				.append(headerStyle);

		wh.append("></div>");

		wh.append("</div>");
		return wh.toString();
	}

	public String drawAllDay(Calendars cal, CalendarEvent self, String id) {
		final String headerColor = self.getHeaderColor();
		final String contentColor = self.getContentColor();
		final String headerStyle = Strings.isBlank(headerColor) ? "" : " style=\"background:" + headerColor + "\"";
		final String contentStyle = Strings.isBlank(contentColor) ? "" : " style=\"background:" + contentColor + "\"";
		final String arrowStyle = Strings.isBlank(contentColor) ? "" :
				"style=\"border-bottom-color:" + contentColor + ";border-top-color:" + contentColor + "\"";

		final Date eventBegin = self.getBeginDate();
		final Date eventEnd = self.getEndDate();
		final Date calBegin = cal.getBeginDate();
		final Date calEnd = cal.getEndDate();

		// CSS ClassName
		final String zcls = self.getZclass();
		final String body = zcls + "-body";
		final String inner = zcls + "-inner";
		final String content = zcls + "-cnt";
		final String text = zcls + "-text";
		final String left_arrow = zcls + "-left-arrow";
		final String right_arrow = zcls + "-right-arrow";
		final String left_arrow_icon = left_arrow + "-icon";
		final String right_arrow_icon = right_arrow + "-icon";

		// round corner
		final String t1 = zcls + "-t1";
		final String t2 = zcls + "-t2";
		final String t3 = zcls + "-t3";
		final String b1 = zcls + "-b1";
		final String b2 = zcls + "-b2";
		final String b3 = zcls + "-b3";
		StringBuffer wh = new StringBuffer();

		wh.append("<div id=\"")
				.append(id)
				.append("\" z.type=\"Calevent\" z.allday=\"true\" class=\"")
				.append(zcls)
				.append("\"");
		wh.append(" z.zcls=\"").append(zcls).append("\"");

		wh.append(" z.bd=\"").append(eventBegin.getTime()).append("\"");
		wh.append(" z.ed=\"").append(eventEnd.getTime()).append("\"");
		wh.append(" z.hc=\"").append(headerColor).append("\"");
		wh.append(" z.cc=\"").append(contentColor).append("\"");
		if (self.isLocked())
			wh.append(" z.locked=\"true\"");

		wh.append(">");

		wh.append("<div class=\"")
				.append(t1)
				.append("\"")
				.append(headerStyle)
				.append("></div><div class=\"")
				.append(t2)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(t3)
				.append("\"></div></div>");

		// body
		wh.append("<div id=\"")
				.append(id)
				.append("!body\" class=\"")
				.append(body)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(inner)
				.append("\"")
				.append(headerStyle)
				.append(">");

		boolean isBefore = eventBegin.before(calBegin);
		boolean isAfter = eventEnd.after(calEnd);
		// content
		wh.append("<div id=\"").append(id).append("!cnt\" class=\"").append(content);

		if (isBefore) wh.append(" ").append(left_arrow);
		if (isAfter) wh.append(" ").append(right_arrow);

		wh.append("\"").append(contentStyle).append(">");

		if (isBefore)
			wh.append("<div class=\"").append(left_arrow_icon)
				.append("\"").append(arrowStyle).append(">&nbsp;</div>");
		if (isAfter)
			wh.append("<div class=\"").append(right_arrow_icon).append("\"")
			.append(arrowStyle).append(">&nbsp;</div>");
		wh.append("<div class=\"").append(text).append("\">");
		escapeXML(wh, self.getContent()).append("</div>");

		wh.append("</div>");

		// the end of body		
		wh.append("</div></div>");

		wh.append("<div class=\"")
				.append(b2)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(b3)
				.append("\"></div></div><div class=\"")
				.append(b1)
				.append("\"")
				.append(headerStyle);

		wh.append("></div>");

		wh.append("</div>");
		return wh.toString();
	}

	public String drawAllDayByMonth(Calendars cal, CalendarEvent self, String id, Date begin, Date end) {
		final String headerColor = self.getHeaderColor();
		final String contentColor = self.getContentColor();
		boolean isContentBlank = Strings.isBlank(contentColor);
		final String headerStyle = Strings.isBlank(headerColor) ? "" : " style=\"background:" + headerColor + "\"";
		final String contentStyle = isContentBlank ? "" : " style=\"background:" + contentColor + "\"";
		final String innerStyle = isContentBlank ? "" :
			" style=\"background:" + contentColor + ";border-left-color:" + contentColor + ";border-right-color:" + contentColor + "\"";
		final String arrowStyle = isContentBlank ? "" :
			"style=\"border-bottom-color:" + contentColor + ";border-top-color:" + contentColor + "\"";
		
		final Date eventBegin = self.getBeginDate();
		final Date eventEnd = self.getEndDate();

		// CSS ClassName
		final String zcls = self.getZclass();
		final String month = zcls + "-daylong-month";
		final String body = zcls + "-body";
		final String inner = zcls + "-inner";
		final String content = zcls + "-cnt";
		final String text = zcls + "-text";
		final String left_arrow = zcls + "-left-arrow";
		final String right_arrow = zcls + "-right-arrow";
		final String left_arrow_icon = left_arrow + "-icon";
		final String right_arrow_icon = right_arrow + "-icon";

		// round corner
		final String t1 = zcls + "-t1";
		final String t2 = zcls + "-t2";
		final String t3 = zcls + "-t3";
		final String b1 = zcls + "-b1";
		final String b2 = zcls + "-b2";
		final String b3 = zcls + "-b3";
		StringBuffer wh = new StringBuffer();

		wh.append("<div z.type=\"Calevent\" z.allday=\"true\" id=\"")
				.append(id)
				.append("\" name=\"")
				.append(id)
				.append("\" class=\"")
				.append(zcls)
				.append(" ")
				.append(month)
				.append("\"");
		wh.append(" z.zcls=\"").append(zcls).append("\"");

		wh.append(" z.bd=\"").append(eventBegin.getTime()).append("\"");
		wh.append(" z.ed=\"").append(eventEnd.getTime()).append("\"");
		wh.append(" z.hc=\"").append(headerColor).append("\"");
		wh.append(" z.cc=\"").append(contentColor).append("\"");
		if (self.isLocked())
			wh.append(" z.locked=\"true\"");

		wh.append(">");

		wh.append("<div class=\"")
				.append(t1)
				.append("\"")
				.append(headerStyle)
				.append("></div><div class=\"")
				.append(t2)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(t3)
				.append("\"")
				.append(contentStyle)
				.append("></div></div>");

		// body
		wh.append("<div id=\"")
				.append(id)
				.append("!body\" class=\"")
				.append(body)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(inner)
				.append("\"")
				.append(innerStyle)
				.append(">");

		boolean isBefore = eventBegin.before(begin);
		boolean isAfter = eventEnd.after(end);
		// content
		wh.append("<div id=\"").append(id).append("!cnt\" class=\"").append(content);

		if (isBefore) wh.append(" ").append(left_arrow);
		if (isAfter) wh.append(" ").append(right_arrow);
		
		wh.append("\"").append(contentStyle).append(">");

		if (isBefore)
			wh.append("<div class=\"").append(left_arrow_icon).append("\"").append(arrowStyle).append(">&nbsp;</div>");
		if (isAfter)
			wh.append("<div class=\"").append(right_arrow_icon).append("\"").append(arrowStyle).append(">&nbsp;</div>");
		wh.append("<div class=\"").append(text).append("\">");
		escapeXML(wh, self.getContent()).append("</div>");

		wh.append("</div>");

		// the end of body		
		wh.append("</div></div>");

		wh.append("<div class=\"")
				.append(b2)
				.append("\"")
				.append(headerStyle)
				.append("><div class=\"")
				.append(b3)
				.append("\"")
				.append(contentStyle)
				.append("></div></div><div class=\"")
				.append(b1)
				.append("\"")
				.append(headerStyle);

		wh.append("></div>");

		wh.append("</div>");
		return wh.toString();
	}

	public String drawDayByMonth(Calendars cal, CalendarEvent self, String id) {
		final String headerColor = self.getHeaderColor();
		final String headerStyle = Strings.isBlank(headerColor) ? "" : " style=\"color:" + headerColor + "\"";
		final String contentStyle = headerStyle;

		final Date eventBegin = self.getBeginDate();
		final Date eventEnd = self.getEndDate();

		// CSS ClassName
		final String zcls = self.getZclass();
		final String month = zcls + "-month";
		final String header = zcls + "-header";
		final String content = zcls + "-cnt";

		DateFormatter df = cal.getDateFormatter();
		StringBuffer wh = new StringBuffer();
		wh.append("<div id=\"").append(id).append("\" z.type=\"Calevent\" class=\"")
			.append(zcls).append(" ").append(month).append("\"");
		wh.append(" z.zcls=\"").append(zcls).append("\"");
		wh.append(" z.bd=\"").append(eventBegin.getTime()).append("\"");
		wh.append(" z.ed=\"").append(eventEnd.getTime()).append("\"");
		if (self.isLocked())
			wh.append(" z.locked=\"true\"");

		wh.append(">");

		// title
		wh.append("<span id=\"")
				.append(id)
				.append("!hd\" class=\"")
				.append(header)
				.append("\"")
				.append(headerStyle)
				.append(">")
				.append(df.getCaptionByTimeOfDay(eventBegin, Locales.getCurrent(), 
						cal.getDefaultTimeZone())).append("&nbsp;</span>");

		// content
		wh.append("<span id=\"")
				.append(id)
				.append("!cnt\" class=\"")
				.append(content)
				.append("\"")
				.append(contentStyle)
				.append(">");
		escapeXML(wh, self.getContent()).append("</span>");

		wh.append("</div>");
		return wh.toString();
	}

}
