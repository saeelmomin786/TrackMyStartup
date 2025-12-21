/**
 * Format date to dd mm yyyy format
 */
export const formatDateDDMMYYYY = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) {
      return dateString.toString();
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day} ${month} ${year}`;
  } catch (error) {
    return dateString.toString();
  }
};

/**
 * Format time to HH:MM AM/PM format
 */
export const formatTimeAMPM = (timeString: string): string => {
  try {
    // Handle time string in format "HH:MM:SS" or "HH:MM"
    const [hours, minutes] = timeString.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      return timeString;
    }
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    const displayMinutes = String(minutes).padStart(2, '0');
    
    return `${displayHours}:${displayMinutes} ${period}`;
  } catch (error) {
    return timeString;
  }
};

/**
 * Format date and time together: "dd mm yyyy, HH:MM AM/PM"
 */
export const formatDateTime = (dateString: string, timeString: string): { date: string; time: string; dateTime: string } => {
  const date = formatDateDDMMYYYY(dateString);
  const time = formatTimeAMPM(timeString);
  return {
    date,
    time,
    dateTime: `${date}, ${time}`
  };
};

/**
 * Format date with weekday: "Day, dd mm yyyy"
 */
export const formatDateWithWeekday = (dateString: string | Date): string => {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    if (isNaN(date.getTime())) {
      return dateString.toString();
    }
    
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekday = weekdays[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${weekday}, ${day} ${month} ${year}`;
  } catch (error) {
    return dateString.toString();
  }
};

