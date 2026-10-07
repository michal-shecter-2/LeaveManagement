<div dir="rtl">

# DECISIONS

> עבדתי עם PostgreSQL.

## 1. החלטות ארכיטקטוניות

- **Backend:** העברתי את הגישה ל־EF Core ואת הלוגיקה העסקית מה־Controller אל
  `LeaveRequestService`. ה־Controller אחראי לקבלת הקלט ולמיפוי תוצאות ה־Service
  לקודי HTTP. השתמשתי ב־result מפורש במקום לזרוק חריגות עבור מצבים עסקיים.
- לא הוספתי Repository או interface, משום ש־EF Core כבר מספק abstraction
  מתאים והיקף הפרויקט קטן.
- **Frontend:** ריכזתי את קריאות ה־HTTP ב־`LeaveRequestsService` stateless,
  הוספתי interfaces ו־enums במקום `any`, וניהלתי state מקומי עם Angular Signals.
  ה־subscriptions מוגנים באמצעות `takeUntilDestroyed` ומצבי loading מתאפסים
  באמצעות `finalize`.
- אחרי יצירה או אישור מתעדכנת רק הבקשה הרלוונטית בזיכרון, בלי לטעון מחדש את
  כל הרשימה. מספר הימים מחושב בשרת, שהוא מקור האמת.

## 2. הבאג ביתרת החופשה

- **מה היה הבאג, איפה, ואיך תיקנתי:** ב־`LeaveRequestService.Create` נבדקו רק
  ימי הבקשה החדשה. הוספתי סכימה של בקשות `Vacation` מאושרות לאותו עובד ובאותה
  שנה, ובדיקה של `usedDays + requestedDays` מול `AnnualQuota`. בזמן approve
  היתרה נבדקת שוב.
- **הטסט שמוכיח את התיקון:**
  `Create_WhenApprovedDaysAndNewRequestExceedQuota_ReturnsBadRequest` — לעובד
  יש 18 ימים מאושרים מתוך מכסה של 20, ובקשה חדשה של 3 ימים נדחית.

## 3. אישור בקשה (approve) ו־concurrency

- **מצבים לא חוקיים:** בקשה שאינה קיימת מחזירה `404`; בקשה שכבר אושרה או
  נדחתה מחזירה `409 Conflict`; גם חוסר יתרה בזמן האישור מחזיר `409` והבקשה
  נשארת Pending.
- **שני אישורים במקביל:** ב־PostgreSQL האישור רץ בתוך transaction ונועל את
  רשומת העובד באמצעות `SELECT ... FOR UPDATE`. כך אישורים של אותו עובד עוברים
  בזה אחר זה, וכל פעולה בודקת את היתרה המעודכנת. ב־SQLite אין row locking זהה;
  בסביבת production הייתי משתמשת ב־PostgreSQL או ב־optimistic concurrency.

## 4. על מה ויתרתי בגלל הזמן

- הייתי מוסיפה validation מלא גם בצד השרת לטווח תאריכים הפוך, לתאריכי עבר
  ולערך enum לא חוקי; כרגע הטופס מונע אותם בצד הלקוח.
- הייתי מגדירה מדיניות לבקשה שחוצה סוף שנה ומוסיפה בדיקת integration שמריצה
  שני אישורים במקביל מול PostgreSQL עם שני `DbContext`-ים.
- בפרונט הייתי מונעת יצירה עד לסיום טעינת הרשימה הראשונית, כדי שתשובה ישנה
  לא תוכל להחליף עדכון מקומי חדש
- בונוס
## 5. שימוש ב־AI

### איפה AI עזר (כולל prompts)
השתמשתי ב־GitHub Copilot.

1. prompt: "I need to make an architectural improvement: the controller is currently
   handling everything (database operations, business logic, and validation). How
   can I improve the separation of concerns cleanly, without over-engineering it?"
   → קיבלתי הצעה להוציא את הלוגיקה ל־Service. התאמתי אותה להיקף הפרויקט,
   מימשתי Service קונקרטי והשארתי את מיפוי קודי ה־HTTP ב־Controller.

2. prompt: "I need to upload the project to Git and make a commit for each task.
   I’ve already completed tasks 1 and 2 without committing them yet; is it possible
   to split the commits even though the changes are in the same files?"
   → קיבלתי הסבר על staging לפי קבצים או חלקי diff. בדקתי כל diff ויצרתי קומיטים
   נפרדים לפי המשימות במקום קומיט אחד גדול.

3. prompt: "In the leave request form, dates that had already passed were blocked
   when selected from the calendar, but it was possible to manually type in a past
   date."
   → קיבלתי הצעה לשלב `min` בשדה עם validator של Reactive Forms. מימשתי את שתי
   ההגנות והוספתי טסט שמוכיח שתאריך עבר הופך את הטופס ללא תקין.

### איפה דחיתי/תיקנתי הצעה של AI

- AI הציע בתחילה למפות כל תשובת `409` באישור להודעה "הבקשה כבר טופלה".
  בדקתי את ה־Controller וראיתי ש־`409` מוחזר גם כאשר יתרת החופשה אינה מספיקה.
  לכן תיקנתי את המימוש כך שה־UI מציג את הודעת השרת כאשר היא קיימת, ומשתמש
  בהודעת fallback רק כשאין הודעה מתאימה.
- בנוסף, נמנעתי מהוספת Repository, NgRx ו־CancellationToken רק כדי להראות
  ארכיטקטורה. הם לא נדרשו להיקף הנוכחי והיו מקשים על הסבר ותחזוקה.

### אבטחה


## 6. הוראות הרצה


</div>
