# DECISIONS

השתמשתי במסד הנתונים PostgreSQL.

## 1. החלטות ארכיטקטוניות

### Backend

- הוצאתי מה־Controller את הגישה ל־EF Core ואת הלוגיקה העסקית אל
  `LeaveRequestService`. ה־Controller נשאר אחראי רק על קבלת הקלט ועל מיפוי
  תוצאת הפעולה לקוד HTTP.
- פעולות ה־Service מחזירות `LeaveRequestOperationResult` עם status מפורש. כך
  אין תלות של שכבת הלוגיקה ב־ASP.NET, והמיפוי ל־`404`, `409` או `400` נשאר
  קריא ב־Controller.
- לא הוספתי Repository או interface ל־Service. EF Core כבר
  מספק abstraction למסד הנתונים, ושכבות נוספות היו מוסיפות קוד בלי ערך ממשי.

### Frontend

- ריכזתי את כל קריאות ה־HTTP ב־`LeaveRequestsService` מטופס. ה־Service הוא
  stateless ומחזיר `Observable` בלי לבצע `subscribe` בעצמו.
- ה־state המקומי של המסך מנוהל באמצעות Angular Signals. השתמשתי ב־enums
  וב־interfaces במקום `any` ומספרי קסם.
- כל subscription בקומפוננטה מוגן באמצעות `takeUntilDestroyed`, ומצבי loading
  מתאפסים ב־`finalize` גם בהצלחה וגם בשגיאה.
- אחרי יצירה או אישור אני מעדכן רק את הבקשה הרלוונטית בזיכרון, במקום לטעון
  מחדש את כל הרשימה.
- הטופס נבנה כ־Reactive Form. הימים מחושבים בשרת ולא מתקבלים מהמשתמש, כדי
  שהשרת יישאר מקור האמת.

### AI
 השתמשתי ב GitHub Copilot

בשיפור אכיטקטורה- 
I need to make an architectural improvement: the controller is currently handling everything (database operations, business logic, and validation). How can I improve the separation of concerns cleanly, without over-engineering it? Please explain the reasoning and provide a clear English prompt for GitHub Copilot.

וגם בהעלה לגיט-
I need to upload the project to Git and make a commit for each task. I’ve already completed tasks 1 and 2 without committing them yet; is it possible to split the commits even though the changes are in the same files? How can I do that?

וגם בבאג שהיה בולידציות שבהקלדה ידנית היה אפשר לבחור תאריך שחלף-
In the leave request form, dates that had already passed were blocked when selected from the calendar, but it was possible to manually type in a past date.

### איפה דחיתי/תיקנתי הצעה של AI

- AI הציע בתחילה למפות כל תשובת `409` באישור להודעה "הבקשה כבר טופלה".
  בדקתי את ה־Controller וראיתי ש־`409` מוחזר גם כאשר יתרת החופשה אינה מספיקה.
  לכן תיקנתי את המימוש כך שה־UI מציג את הודעת השרת כאשר היא קיימת, ומשתמש
  בהודעת fallback רק כשאין הודעה מתאימה.
- בנוסף, נמנעתי מהוספת Repository, NgRx ו־CancellationToken רק כדי להראות
  ארכיטקטורה. הם לא נדרשו להיקף הנוכחי והיו מקשים על הסבר ותחזוקה.

אם היה עוד זמן הייתי עוברת על הקוד מבחינת אבטחה (בונוס).
