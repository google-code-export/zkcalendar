/* Calendars.java

{{IS_NOTE
	Purpose:
		
	Description:
		
	History:
		Mar 10, 2009 3:11:54 PM , Created by jumperchen
}}IS_NOTE

Copyright (C) 2009 Potix Corporation. All Rights Reserved.

{{IS_RIGHT
}}IS_RIGHT
 */
package org.zkoss.calendar;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;

import org.zkoss.calendar.api.CalendarEvent;
import org.zkoss.calendar.api.CalendarModel;
import org.zkoss.calendar.api.DateFormatter;
import org.zkoss.calendar.api.EventRender;
import org.zkoss.calendar.api.RenderContext;
import org.zkoss.calendar.au.in.CaleventCreateCommand;
import org.zkoss.calendar.au.in.CaleventEditCommand;
import org.zkoss.calendar.au.in.CaleventUpdateCommand;
import org.zkoss.calendar.au.in.DayClickCommand;
import org.zkoss.calendar.au.in.WeekClickCommand;
import org.zkoss.calendar.event.CalendarDataEvent;
import org.zkoss.calendar.event.CalendarDataListener;
import org.zkoss.calendar.impl.SimpleDateFormatter;
import org.zkoss.calendar.impl.SimpleEventRender;
import org.zkoss.lang.Classes;
import org.zkoss.lang.Objects;
import org.zkoss.xml.HTMLs;
import org.zkoss.zk.au.Command;
import org.zkoss.zk.ui.Component;
import org.zkoss.zk.ui.UiException;
import org.zkoss.zk.ui.event.Events;
import org.zkoss.zk.ui.sys.DesktopCtrl;
import org.zkoss.zul.Toolbar;
import org.zkoss.zul.impl.XulElement;

/**
 * A complete calendar component to represent a calendar to support both molds, 
 * default and month, and multi-timezone. By default mold, it can change the days
 * to show one day or a week (days equal to seven) on the calendar at the same time.
 * In the month mold, seven days is always assumed.
 * 
 * <p> The Calendars component doesn't allow any child component, and now it can
 * only manipulate the calendar event by a model named {@link CalendarModel}. And there
 * are three events, <code>onEventCreate</code>, <code>onEventEdit</code>, and 
 * <code>onEventUpdate</code> that can be listened to operate the calendar event
 * triggering by user action, in addition to there are two events <code>onDayClick</code> and
 * <code>onWeekClick</code> to be triggered when user clicks on the caption of
 * the day number and the week number within the current year. Besides,
 * the calendar can also support the read-only
 * display by invoking {@link #setReadonly(boolean)}.
 * 
 * @author jumperchen
 * 
 */
public class Calendars extends XulElement implements
		org.zkoss.calendar.api.Calendars {
	private static final long serialVersionUID = 20090310L;
	private static final String ATTR_ON_INIT_POSTED =
		"org.zkoss.calendar.Calendars.onInitLaterPosted";
	private int _firstDayOfWeek;
	private Date _curDate;
	private int _days = 7;
	private DateFormatter _dfmter;
	private DateFormatter _ddfmter;
	private EventRender _render;
	private EventRender _defrender;
	private Map<String, List<CalendarEvent>> _evts;
	private Map<TimeZone, String> _tzones;
	private Map<Object, Object> _ids;
	private CalendarModel _model;
	private transient CalendarDataListener _dataListener;
	private SimpleDateFormat _sdfKey = new SimpleDateFormat("yyyy/MM/dd");
	private boolean _readonly;
	private boolean _weekOfYear;
	
	static {
		new CaleventCreateCommand("onEventCreate", 0);
		new CaleventEditCommand("onEventEdit", 0);
		new CaleventUpdateCommand("onEventUpdate", 0);
		new DayClickCommand("onDayClick", Command.IGNORABLE);
		new WeekClickCommand("onWeekClick", Command.IGNORABLE);
	}
	public Calendars() {
		init();
		setCurrentDate(Calendar.getInstance().getTime());
	}
	
	private void init() {
		_evts = new HashMap<String, List<CalendarEvent>>(32);
		_tzones = new LinkedHashMap<TimeZone, String>();
		_ids = new HashMap<Object, Object>(32);
		_firstDayOfWeek = Calendar.getInstance().getFirstDayOfWeek();
	}
	
	/**
	 * Sets whether enable to show the week number within the current year or not.
	 */
	public void setWeekOfYear(boolean weekOfYear) {
		if (_weekOfYear != weekOfYear) {
			_weekOfYear = weekOfYear;
			if ("month".equals(getMold())) invalidate();
		}
	}
	
	/**
	 * Returns whether enable to show the week number within the current year or not.
	 * <p>Default: false
	 */
	public boolean isWeekOfYear() {
		return _weekOfYear;
	}
	/** Returns whether it is readonly.
	 * <p>Default: false.
	 */
	public boolean isReadonly() {
		return _readonly;
	}
	/** Sets whether it is readonly.
	 */
	public void setReadonly(boolean readonly) {
		if (_readonly != readonly) {
			_readonly = readonly;
			invalidate();
		}
	}
	/**
	 * Returns the current time zone of the calendar.
	 */
	public TimeZone getDefaultTimeZone() {
		if (_tzones.isEmpty()) {
			TimeZone t = TimeZone.getDefault();
			_tzones.put(t, "");
			return t;
		}
		return (TimeZone) _tzones.keySet().iterator().next();
	}
	public String getCalendarEventId(CalendarEvent ce) {
		Object o = _ids.get(ce);
		if (o == null) {
			o = ((DesktopCtrl)getDesktop()).getNextUuid();
			_ids.put(o, ce);
			_ids.put(ce, o);
		}
		return (String) o;
	}
	
	public CalendarEvent getCalendarEventById(String id) {
		return (CalendarEvent)_ids.get(id);
	}
	/** Initializes _dataListener and register the listener to the model
	 */
	private void initDataListener() {
		if (_dataListener == null)
			_dataListener = new CalendarDataListener() {
				public void onChange(CalendarDataEvent event) {
					onCalendarDataChange(event);
				}
			};

		_model.addCalendarDataListener(_dataListener);
	}
	private void onCalendarDataChange(CalendarDataEvent event) {
		postOnInitRender();		
	}

	/**
	 * Returns the calendar model.
	 */
	public CalendarModel getModel() {
		return _model;
	}
	public void setMold(String mold) {
		if (mold == null || mold.length() == 0)
			mold = "default";
		if (!Objects.equals(getMold(), mold)) {
			super.setMold(mold);
			postOnInitRender();
		}
	}

	/**
	 * Sets the calendar model.
	 */
	public void setModel(CalendarModel model) {
		if (model != null) {
			if (_model != model) {
				if (_model != null) {
					_model.removeCalendarDataListener(_dataListener);
				}
				_model = model;
				initDataListener();
			}
		} else if (_model != null) {
			_model.removeCalendarDataListener(_dataListener);
			_model = null;
		}
		postOnInitRender();
	}

	/**
	 * Adds the time zone to the calendar.
	 * <p>
	 * Note: the first added will be the default time zone of the calendar.
	 * 
	 * @param label
	 *            the description of the time zone.
	 * @param timezone
	 *            a time zone. (Cannot duplicate)
	 */
	
	public void addTimeZone(String label, TimeZone timezone) {
		if (label == null) label = "";
		_tzones.put(timezone, label);
		postOnInitRender();
	}

	/**
	 * Adds the time zone to the calendar.
	 * <p>
	 * Note: the first added will be the default time zone of the calendar.
	 * 
	 * @param label
	 *            the description of the time zone.
	 * @param timezone
	 *            a id of time zone. (Cannot duplicate)
	 * @see TimeZone#getTimeZone(String)
	 * @see #addTimeZone(String, TimeZone)
	 */
	public void addTimeZone(String label, String timezone) {
		addTimeZone(label, TimeZone.getTimeZone(timezone));
	}

	/**
	 * Sets the time zone to the calendar, it is easily used for ZUL file. e.g.
	 * 
	 * <pre>
	 * &lt;calendars timeZone=&quot;Taiwan=GMT+8, Sweden=GMT+1,&quot;&gt;
	 * </pre>
	 * 
	 * @param timezone
	 */
	public void setTimeZone(String timezone) {
		if (timezone == null)
			throw new IllegalArgumentException("The timezone is null!");
		String[] timezones = timezone.trim().split(",");
		for (int i = 0; i < timezones.length; i++) {
			String[] pair = timezones[i].split("=");
			addTimeZone(pair[0].trim(), pair[1].trim());
		}
	}

	/**
	 * Removes the time zone from the calendar
	 */
	public boolean removeTimeZone(TimeZone timezone) {
		if (_tzones.remove(timezone) != null) {
			postOnInitRender();
			return true;
		}
		return false;
	}

	/**
	 * Returns the unmodifiable map including all the timezone inside the
	 * calendar.
	 */
	public Map<TimeZone, String> getTimeZones() {
		return Collections.unmodifiableMap(_tzones);
	}
	
	protected String getEventKey(CalendarEvent evt) {
		Date begin = evt.getBeginDate();
		Date end = evt.getEndDate();
		if (begin == null)
			throw new UiException("Begin date cannot be null: " + evt);
		if (end == null)
			throw new UiException("End date cannot be null: " + evt);
		return getEventKey(begin);
	}
	
	private String getEventKey(Date date) {
		return _sdfKey.format(date);
	}

	/**
	 * Returns the unmodifiable list including all the calendar events matching
	 * from the specified date in the same date. e.g. "20090324" exclusive the
	 * time of the date "23:30".
	 * <p>
	 * Note: never null.
	 */
	public List<CalendarEvent> getEvent(Date beginDate) {
		String key = getEventKey(beginDate);
		List<CalendarEvent> list = _evts.get(key);
		if (list != null)
			Collections.sort(list, getDefaultBeginDateComparator());
		else list = Collections.emptyList();
		return Collections.unmodifiableList(list);
	}	
	private static final Comparator<CalendarEvent> getDefaultBeginDateComparator() {
		return _defCompare;
	}
	private static final Comparator<CalendarEvent> _defCompare = new Comparator<CalendarEvent>() {
		public int compare(CalendarEvent arg0, CalendarEvent arg1) {
			return arg0.getBeginDate().compareTo(arg1.getBeginDate());
		}
	};

	/**
	 * Returns the event renderer used for {@link CalendarEvent} to draw its
	 * outline (i.e. HTML), like the DSP renderer of ZK component.
	 * <p>
	 * Note: never null.
	 */
	public EventRender getEventRender() {
		return _render != null ? _render : getDefaultRender();
	}

	private EventRender getDefaultRender() {
		if (_defrender == null)
			_defrender = new SimpleEventRender();
		return _defrender;
	}

	/**
	 * Sets the event renderer.
	 */
	public void setEventRender(EventRender render) {
		if (_render != render) {
			_render = render;
			invalidate();
		}
	}

	/**
	 * Sets the date formatter. In fact, there are five places in the calendar
	 * must have different date display.
	 * 
	 * @see DateFormatter
	 */
	public void setDateFormatter(DateFormatter dfmater) {
		if (_dfmter != dfmater) {
			_dfmter = dfmater;
			invalidate();
		}
	}
	/**
	 * 
	 * Sets the date formatter by a class name.
	 * 
	 * @see DateFormatter
	 * @see #setDateFormatter(DateFormatter)
	 */
	public void setDateFormatter(String clsnm)
	throws ClassNotFoundException, NoSuchMethodException, IllegalAccessException,
	InstantiationException, java.lang.reflect.InvocationTargetException {
		if (clsnm != null)
			setDateFormatter((DateFormatter)Classes.newInstanceByThread(clsnm));
	}
	/**
	 * Returns the date formatter.
	 * <p>
	 * Note: never null.
	 */
	public DateFormatter getDateFormatter() {
		return _dfmter != null ? _dfmter : getDefaultFormatter();
	}
	
	private DateFormatter getDefaultFormatter() {
		if (_ddfmter == null)
			 _ddfmter = new SimpleDateFormatter();
		return _ddfmter;
	}
	
	/**package*/ boolean inMonthMold() {
		return "month".equals(getMold());
	}

	/**
	 * Returns the beginning date, which is based on {@link #getCurrentDate()} in
	 * the current view depended on which {@link #getMold()} is using.
	 */
	public Date getBeginDate() {
		if (_curDate != null) {
			TimeZone t = getDefaultTimeZone();
			Calendar cal = Calendar.getInstance(t);
			cal.setTimeZone(getDefaultTimeZone());
			cal.setTime(_curDate);
			boolean inMonth = inMonthMold();
			if (inMonth)
				cal.set(Calendar.DAY_OF_MONTH, 1);
				
			if (_days == 7 || inMonth) {
				int index = cal.get(Calendar.DAY_OF_WEEK);
				int offset = index - _firstDayOfWeek;
				if (offset < 0) offset += 7;
				cal.add(Calendar.DAY_OF_MONTH, -offset);
			}
			
			cal.set(Calendar.HOUR_OF_DAY, 0);
			cal.set(Calendar.MINUTE, 0);
			cal.set(Calendar.SECOND, 0);
			cal.set(Calendar.MILLISECOND, 0);
			return cal.getTime();
		}
		return null; 
	}

	/**
	 * Returns the end date, which is based on {@link #getCurrentDate()} in the
	 * current view depended on which {@link #getMold()} is using. 
	 */
	public Date getEndDate() {
		Date beginDate = getBeginDate();
		if (beginDate != null) {
			Calendar cal = Calendar.getInstance(getDefaultTimeZone());

			if (inMonthMold()) {
				int weeks = getWeekOfMonth();
				cal.setTime(_curDate);			
				cal.set(Calendar.DAY_OF_MONTH, 1);
				int offset = cal.get(Calendar.DAY_OF_WEEK) - _firstDayOfWeek;
				if (offset < 0)
					offset += 7;
				
				cal.add(Calendar.DAY_OF_MONTH, weeks * 7 - offset);
				cal.set(Calendar.HOUR_OF_DAY, 0);
				cal.set(Calendar.MINUTE, 0);
				cal.set(Calendar.SECOND, 0);	
			} else {
				cal.setTime(beginDate);
				cal.add(Calendar.DAY_OF_MONTH, _days);
			}
			cal.set(Calendar.MILLISECOND, 0);
			return cal.getTime();
		}
		return null;
	}

	/**
	 * Returns the number of the week of the month in the current date.
	 */
	public int getWeekOfMonth() {
		Calendar cal = Calendar.getInstance(getDefaultTimeZone());
		// calculate how many weeks we should display
		cal.setTime(_curDate);
		int maximun = cal.getActualMaximum(Calendar.DAY_OF_MONTH);
		
		if (cal.getFirstDayOfWeek() != _firstDayOfWeek) {			
			cal.set(Calendar.DAY_OF_MONTH, 1);
			int beginIndex = cal.get(Calendar.DAY_OF_WEEK);
			int offset = beginIndex - _firstDayOfWeek;
			if (offset < 0)
				offset += 7;
			
			int week = 1;
			int delta = maximun - (7 - offset);
			week += delta/ 7;

			// add one for the rest days
			if (delta % 7 != 0) 
				++week;
			return week;
		} else {
			cal.set(Calendar.DAY_OF_MONTH, maximun);
			return cal.get(Calendar.WEEK_OF_MONTH);
		}
	}

	/**
	 * Navigates the current date to the previous page, that is, when the {@link #getDays()}
	 * is seven with default mold, the previous page means the previous week.
	 * In the month mold, it means the previous month.
	 */
	public void previousPage() {
		if (_curDate != null) {
			Calendar cal = Calendar.getInstance(getDefaultTimeZone());
			cal.setTime(_curDate);
			if (inMonthMold())
				cal.add(Calendar.MONTH, -1);
			else
				cal.add(Calendar.DAY_OF_MONTH, -_days);
			setCurrentDate(cal.getTime());
		}
	}

	/**
	 * Navigates the current date to the next page, that is, when the {@link #getDays()}
	 * is seven with default mold, the next page means the next week.
	 * In the month mold, it means the next month.
	 */	
	public void nextPage() {
		if (_curDate != null) {
			Calendar cal = Calendar.getInstance(getDefaultTimeZone());
			cal.setTime(_curDate);
			if (inMonthMold())
				cal.add(Calendar.MONTH, 1);
			else
				cal.add(Calendar.DAY_OF_MONTH, _days);
			setCurrentDate(cal.getTime());
		}
	}

	/**
	 * Sets the current date.
	 * <p> Default: today (depend on which timezone the system is using).
	 */
	public void setCurrentDate(Date curDate) {
		if (curDate == null) throw new NullPointerException("Current Date cannot be null!");
		if (!Objects.equals(curDate, _curDate)) {
			_curDate = curDate;
			postOnInitRender();
		}
	}
	/**
	 * Returns the current date.
	 * <p> Default: today (depend on which timezone the calendar is using).
	 */
	public Date getCurrentDate() {
		return _curDate;
	}
	public void onInitRender() {
		removeAttribute(ATTR_ON_INIT_POSTED);
		_evts.clear();
		_ids.clear();
		
		final TimeZone tzone = getDefaultTimeZone();
		
		// reset default timezone
		_sdfKey.setTimeZone(tzone);
		
		if (_model != null) {
			List<CalendarEvent> list = _model.get(getBeginDate(), getEndDate(), new RenderContext() {
				public TimeZone getTimeZone() {
					return tzone;
				}});
			if (list != null) {
				for (CalendarEvent ce : list) {
					if (!ce.getBeginDate().before(ce.getEndDate()))
						throw new IllegalArgumentException("Illegal date: from " + ce.getBeginDate() + " to " + ce.getEndDate());
					String key;
					if (ce.getBeginDate().before(getBeginDate()))
						key = getEventKey(getBeginDate());
					else
						key = getEventKey(ce.getBeginDate());
					
					List<CalendarEvent> dayevt = _evts.get(key);
					if (dayevt == null) {
						dayevt = new LinkedList<CalendarEvent>();
						_evts.put(key, dayevt);
					} 
					dayevt.add(ce);
				}
			}
		}
		invalidate();
	}
	private void postOnInitRender() {
		if (getAttribute(ATTR_ON_INIT_POSTED) == null) {
			setAttribute(ATTR_ON_INIT_POSTED, Boolean.TRUE);
			Events.postEvent(-10100, "onInitRender", this, null);
		}
	}
	/**
	 * Sets the days, that is, how many column should be displayed on the default mold.
	 * <p> Default: 7. (i.e. one week), in month view, the attribute will be ignored.
	 */
	public void setDays(int days) {
		if (days <= 0) days = 1;
		if (days != _days) {
			_days = days;
			if (!inMonthMold()) {
				postOnInitRender();
			}
		}
	}
	
	/**
	 * Returns the days.
	 * <p>Default: 7
	 */
	public int getDays() {
		return _days;
	}
	/**
	 * Sets what the first day of the week is; e.g., <code>SUNDAY</code> in the
	 * U.S., <code>MONDAY</code> in France.
	 * <p> Default: {@link Calendar#SUNDAY}
	 * <p> Note: it is only allowed when days with 7 in the default mold or using the month mold.
	 * @param value
	 *            the given first day of the week.
	 * @see #getFirstDayOfWeek()
	 * @see java.util.Calendar#setFirstDayOfWeek
	 */
	public void setFirstDayOfWeek(int value) {
		if (_firstDayOfWeek != value) {
			_firstDayOfWeek = value;
			if (_days == 7 || inMonthMold())
				postOnInitRender();
		}
	}
	
	/**
	 * Sets what the first day of the week is.
	 * <p> Note: it is only allowed when days with 7 in the default mold or using the month mold.
	 * 
	 * @param day <code>SUNDAY</code>, <code>MONDAY</code>,
	 * <code>TUESDAY</code>, <code>WEDNESDAY</code>, <code>THURSDAY</code>, <code>FRIDAY</code>,
	 * and <code>SATURDAY</code>. Case insensitive
 	 */
	public void setFirstDayOfWeek(String day) {
		if ("SUNDAY".equalsIgnoreCase(day))
			setFirstDayOfWeek(1);
		else if ("MONDAY".equalsIgnoreCase(day))
			setFirstDayOfWeek(2);
		else if ("TUESDAY".equalsIgnoreCase(day))
			setFirstDayOfWeek(3);
		else if ("WEDNESDAY".equalsIgnoreCase(day))
			setFirstDayOfWeek(4);
		else if ("THURSDAY".equalsIgnoreCase(day))
			setFirstDayOfWeek(5);
		else if ("FRIDAY".equalsIgnoreCase(day))
			setFirstDayOfWeek(6);
		else if ("SATURDAY".equalsIgnoreCase(day))
			setFirstDayOfWeek(7);	
	}
	
	/**
	 * Gets what the first day of the week is; e.g., <code>SUNDAY</code> in the
	 * U.S., <code>MONDAY</code> in France.
	 * <p> Default: {@link Calendar#SUNDAY}
	 * 
	 * @return the first day of the week.
	 * @see #setFirstDayOfWeek(int)
	 * @see java.util.Calendar#getFirstDayOfWeek
	 */
	public int getFirstDayOfWeek() {
		return _firstDayOfWeek;
	}
	
	public Toolbar getToolbar() {
		return (Toolbar)getFirstChild();
	}

	// super
	public String getZclass() {
		return _zclass == null ?  "z-calendars" : _zclass;
	}

	protected String getRealSclass() {
		final String scls = super.getRealSclass();
		final String added = inMonthMold() ? getZclass() + "-month" : "";
		return scls == null ? added : scls + " " + added;
	}
	
	// -- Component --//	
	public boolean insertBefore(Component newChild, Component refChild) {
		if (newChild instanceof Toolbar) {
			Component first = getFirstChild();
			if (first instanceof Toolbar && first != newChild)
				throw new UiException("Only one toolbar child is allowed: "
						+ this);
			refChild = first;
		} else {
			throw new UiException("Unsupported child for Calendars: "
					+ newChild);
		}
		return super.insertBefore(newChild, refChild);
	}
	public String getOuterAttrs() {
		final StringBuffer sb =
			new StringBuffer(80).append(super.getOuterAttrs());
		
		if (inMonthMold()) {
			if (_weekOfYear) HTMLs.appendAttribute(sb, "z.woy", true);
			HTMLs.appendAttribute(sb, "z.mon", true);
		} else
			HTMLs.appendAttribute(sb, "z.ts", _tzones.size());
		
		HTMLs.appendAttribute(sb, "z.bd", getBeginDate().getTime());
		HTMLs.appendAttribute(sb, "z.ed", getEndDate().getTime());

		if (_readonly)
			HTMLs.appendAttribute(sb, "z.readonly", true);
		
		appendAsapAttr(sb, "onEventCreate");
		appendAsapAttr(sb, "onEventEdit");
		appendAsapAttr(sb, "onEventUpdate");
		appendAsapAttr(sb, "onDayClick");
		appendAsapAttr(sb, "onWeekClick");
		
		// the unit of the offset in Javascript is minute
		TimeZone tz = getDefaultTimeZone();
		HTMLs.appendAttribute(sb, "z.tz", (tz.getRawOffset() + (tz.useDaylightTime() ? tz.getDSTSavings() : 0))/60000);
		return sb.toString();
	}
	//Cloneable//
	public Object clone() {
		final Calendars clone = (Calendars)super.clone();
		clone.init();
		if (clone._model != null) {
			//we use the same data model but we have to create a new listener
			clone._dataListener = null;
			clone.initDataListener();
		}
		return clone;
	}

	//-- Serializable --//
	private synchronized void readObject(java.io.ObjectInputStream s)
	throws java.io.IOException, ClassNotFoundException {
		s.defaultReadObject();

		init();

		if (_model != null) initDataListener();
	}
}
