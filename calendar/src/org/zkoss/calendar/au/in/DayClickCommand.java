/* DayClickCommand.java

{{IS_NOTE
	Purpose:
		
	Description:
		
	History:
		Jun 18, 2009 12:27:41 PM , Created by jumperchen
}}IS_NOTE

Copyright (C) 2009 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
}}IS_RIGHT
*/
package org.zkoss.calendar.au.in;

import java.util.Date;

import org.zkoss.calendar.Calendars;
import org.zkoss.lang.Objects;
import org.zkoss.zk.au.AuRequest;
import org.zkoss.zk.au.Command;
import org.zkoss.zk.mesg.MZk;
import org.zkoss.zk.ui.UiException;
import org.zkoss.zk.ui.event.Event;
import org.zkoss.zk.ui.event.Events;

/**
 * Used only by {@link Calendars} to handle the command that the {@link Event} is
 * triggered by user clicked upon the caption of the number of day.
 * By default, the data of the event is the clicked date.
 * @author jumperchen
 *
 */
public class DayClickCommand extends Command {

	public DayClickCommand(String id, int flags) {
		super(id, flags);
	}
	@Override
	protected void process(AuRequest request) {
		final Calendars cmp = (Calendars)request.getComponent();
		if (cmp == null)
			throw new UiException(MZk.ILLEGAL_REQUEST_COMPONENT_REQUIRED, this);

		final String[] data = request.getData();
		if (data == null || data.length != 1)
			throw new UiException(MZk.ILLEGAL_REQUEST_WRONG_DATA, new Object[] {
					Objects.toString(data), this });
		
		Events.postEvent(new Event(getId(), cmp, new Date(Long.parseLong(data[0]))));
	}

}
