/* CalendarDataEvent.java

{{IS_NOTE
	Purpose:
		
	Description:
		
	History:
		Mar 17, 2009 4:40:42 PM , Created by jumperchen
}}IS_NOTE

Copyright (C) 2009 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
}}IS_RIGHT
*/
package org.zkoss.calendar.event;

import java.util.Date;
import java.util.TimeZone;

import org.zkoss.calendar.api.CalendarModel;

/**
 * Defines an event that encapsulates changes to a date range. 
 * 
 * @author jumperchen
 */
public class CalendarDataEvent {
	/** Identifies one or more changes in the lists contents. */
	public static final int CONTENTS_CHANGED = 0;
    /** Identifies the addition of one or more contiguous items to the list. */    
	public static final int INTERVAL_ADDED = 1;
    /** Identifies the removal of one or more contiguous items from the list. */   
	public static final int INTERVAL_REMOVED = 2;

	private final CalendarModel _model;
	private final int _type;
	private final Date _begin, _end;
	private final TimeZone _timezone;

	/** Contructor.
	 *
	 * @param type one of {@link #CONTENTS_CHANGED},
	 * {@link #INTERVAL_ADDED}, {@link #INTERVAL_REMOVED}.
	 */
	public CalendarDataEvent(CalendarModel model, int type, Date begin, Date end, TimeZone timezone) {
		if (model == null)
			throw new IllegalArgumentException();
		_model = model;
		_type = type;
		_begin = begin;
		_end = end;
		_timezone = timezone;
	}
	/** Returns the calendar model that fires this event.
	 */
	public CalendarModel getModel() {
		return _model;
	}
	/** Returns the event type. One of {@link #CONTENTS_CHANGED},
	 * {@link #INTERVAL_ADDED}, {@link #INTERVAL_REMOVED}.
	 */
	public int getType() {
		return _type;
	}
	/** Returns the begin date of the change range.
	 */
	public Date getBeginDate() {
		return _begin;
	}
	/** Returns the end date of the change range.
	 */
	public Date getEndDate() {
		return _end;
	}
	/**
	 * Return the time zone of the calendar
	 */
	public TimeZone getTimeZone() {
		return _timezone;
	}
	//Object//
	public String toString() {
		return "[CalendarDataEvent type=" + _type +", begin="+_begin+", end="+_end+']';
	}
}
