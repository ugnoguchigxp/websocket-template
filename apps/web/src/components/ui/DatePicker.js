/**
 * DatePicker Component
 * Touch-optimized wrapper for react-datepicker with Japanese locale support
 */
import { createContextLogger } from '@logger';
import { format, getMonth, getYear } from 'date-fns';
import { ja } from 'date-fns/locale';
import ReactDatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useRef, useState, useEffect, useMemo } from 'react';
import './DatePicker.css';
const log = createContextLogger('DatePicker');
// Register Japanese locale
registerLocale('ja', ja);
const DatePicker = ({ value, onChange, selectsRange = false, startDate, endDate, onRangeChange, label = '日付を選択', minDate, maxDate, disabled = false, className = '', monthsShown = 1, }) => {
    const justClosedRef = useRef(false);
    const closeTimer1Ref = useRef(null);
    const closeTimer2Ref = useRef(null);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [showMonthPicker, setShowMonthPicker] = useState(false);
    // Generate years array (100 years centered on current year)
    const years = useMemo(() => Array.from({ length: 100 }, (_, i) => getYear(new Date()) - 50 + i), []);
    // Month names in Japanese
    const months = [
        '1月',
        '2月',
        '3月',
        '4月',
        '5月',
        '6月',
        '7月',
        '8月',
        '9月',
        '10月',
        '11月',
        '12月',
    ];
    // Handle both single date and range selection
    const handleChange = (date) => {
        if (selectsRange && Array.isArray(date)) {
            const [start, end] = date;
            log.debug('Date range selected', {
                startDate: start?.toISOString(),
                endDate: end?.toISOString(),
            });
            if (onRangeChange) {
                onRangeChange([start, end]);
            }
        }
        else if (!selectsRange && !Array.isArray(date)) {
            log.debug('Date selected', { date: date?.toISOString() });
            if (onChange) {
                onChange(date);
            }
        }
    };
    const handleCalendarClose = () => {
        log.debug('Calendar closing');
        justClosedRef.current = true;
        closeTimer1Ref.current = setTimeout(() => {
            const activeElement = document.activeElement;
            if (activeElement) {
                activeElement.blur();
            }
            closeTimer2Ref.current = setTimeout(() => {
                justClosedRef.current = false;
            }, 100);
        }, 50);
    };
    const handleCalendarOpen = () => {
        if (justClosedRef.current) {
            log.debug('Ignoring open - just closed');
            return false;
        }
        log.debug('Opening calendar');
        return true;
    };
    // Custom header render function
    const renderCustomHeader = ({ date, decreaseMonth, increaseMonth, changeYear, monthDate, }) => {
        // Use monthDate instead of date for the header display
        const displayDate = monthDate || date;
        // Handle month navigation - navigate by monthsShown for multiple months
        const handleDecrease = () => {
            if (monthsShown > 1) {
                // Navigate by the number of months shown
                for (let i = 0; i < monthsShown; i++) {
                    decreaseMonth();
                }
            }
            else {
                decreaseMonth();
            }
        };
        const handleIncrease = () => {
            if (monthsShown > 1) {
                // Navigate by the number of months shown
                for (let i = 0; i < monthsShown; i++) {
                    increaseMonth();
                }
            }
            else {
                increaseMonth();
            }
        };
        return (<div className="custom-header">
        <button type="button" onClick={handleDecrease} className="month-nav-button">
          &lt;
        </button>
        <div className="header-label-container">
          <button type="button" className="header-year" onClick={() => setShowYearPicker((prev) => !prev)}>
            {format(displayDate, 'yyyy年', { locale: ja })}
          </button>
          <button type="button" className="header-month" onClick={() => setShowMonthPicker((prev) => !prev)}>
            {format(displayDate, 'MM月', { locale: ja })}
          </button>
        </div>
        <button type="button" onClick={handleIncrease} className="month-nav-button">
          &gt;
        </button>

        {showYearPicker && (<div className="year-month-picker">
            <div className="year-list">
              {years.map((year) => (<button key={year} type="button" onClick={() => {
                        changeYear(year);
                        setShowYearPicker(false);
                    }} className={getYear(displayDate) === year ? 'selected' : ''}>
                  {year}年
                </button>))}
            </div>
          </div>)}

        {showMonthPicker && (<div className="year-month-picker">
            <div className="month-list">
              {months.map((monthName, monthIndex) => (<button key={monthName} type="button" onClick={() => {
                        const newDate = new Date(displayDate);
                        newDate.setMonth(monthIndex);
                        changeYear(getYear(newDate));
                        setShowMonthPicker(false);
                    }} className={getMonth(displayDate) === monthIndex ? 'selected' : ''}>
                  {monthName}
                </button>))}
            </div>
          </div>)}
      </div>);
    };
    // Cleanup timers on unmount
    useEffect(() => {
        return () => {
            if (closeTimer1Ref.current) {
                clearTimeout(closeTimer1Ref.current);
            }
            if (closeTimer2Ref.current) {
                clearTimeout(closeTimer2Ref.current);
            }
        };
    }, []);
    log.debug('DatePicker rendering', {
        selectsRange,
        value: value?.toISOString(),
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString(),
        monthsShown,
    });
    // Prepare props based on mode (single date vs range)
    const commonProps = {
        onCalendarClose: handleCalendarClose,
        onCalendarOpen: handleCalendarOpen,
        minDate,
        maxDate,
        disabled,
        locale: 'ja',
        dateFormat: 'yyyy年MM月dd日',
        placeholderText: label,
        renderCustomHeader,
        calendarClassName: 'touch-optimized-calendar',
        wrapperClassName: 'datepicker-input-wrapper',
        className: 'datepicker-input',
        withPortal: true,
        portalId: 'datepicker-portal',
        monthsShown,
    };
    return (<div className={`datepicker-wrapper ${className}`}>
      {selectsRange ? (<ReactDatePicker {...commonProps} selectsRange startDate={startDate || undefined} endDate={endDate || undefined} selected={startDate || undefined} onChange={handleChange}/>) : (<ReactDatePicker {...commonProps} selected={value || undefined} onChange={handleChange}/>)}
    </div>);
};
export default DatePicker;
