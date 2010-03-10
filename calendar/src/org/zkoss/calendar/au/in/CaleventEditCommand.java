/* CaleventEditCommand.java

{{IS_NOTE
	Purpose:
		
	Description:
		
	History:
		Mar 31, 2009 4:33:35 PM , Created by jumperchen
}}IS_NOTE

Copyright (C) 2009 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
}}IS_RIGHT
 */
package org.zkoss.calendar.au.in;

import org.zkoss.calendar.Calendars;
import org.zkoss.calendar.api.CalendarEvent;
import org.zkoss.calendar.event.CalendarsEvent;
import org.zkoss.lang.Objects;
import org.zkoss.zk.au.AuRequest;
import org.zkoss.zk.au.Command;
import org.zkoss.zk.mesg.MZk;
import org.zkoss.zk.ui.UiException;
import org.zkoss.zk.ui.event.Events;

/**
 * Used only by {@link Calendars} to implement the {@link CalendarsEvent}
 * relevant command.
 * @author jumperchen
 * 
 */
public class CaleventEditCommand extends Command {

	public CaleventEditCommand(String id, int flags) {
		super(id, flags);
	}

	protected void process(AuRequest request) {
		final Calendars cmp = (Calendars) request.getComponent();
		if (cmp == null)
			throw new UiException(MZk.ILLEGAL_REQUEST_COMPONENT_REQUIRED, this);

		final String[] data = request.getData();
		if (data == null || data.length != 5)
			throw new UiException(MZk.ILLEGAL_REQUEST_WRONG_DATA, new Object[] {
					Objects.toString(data), this });
		CalendarEvent ce = cmp.getCalendarEventById(data[0]);
		if (ce != null)
			Events.postEvent(new CalendarsEvent(getId(), cmp, ce, null, null,
				Integer.parseInt(data[1]), Integer.parseInt(data[2]), Integer
						.parseInt(data[3]), Integer.parseInt(data[4])));

	}

}
