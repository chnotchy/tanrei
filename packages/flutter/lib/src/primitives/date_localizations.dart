import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';

/// A field of a numeric date: what `TanreiDateLocalizations.numericDateOrder` lists, in the
/// locale's order.
enum TanreiDateField {
  /// The four-digit year.
  year,

  /// The month, 1 to 12.
  month,

  /// The day of the month.
  day,
}

/// The locale data a Tanrei date picker draws with: month and weekday names, the date forms, the
/// digits and the numeric date's order and separator (spec DTP-37).
///
/// Flutter's widgets library has no date symbols, and `package:tanrei` takes no `intl` dependency.
/// The package ships English ([TanreiEnglishDateLocalizations], through [delegate]); a product in
/// another language adds its own `LocalizationsDelegate<TanreiDateLocalizations>` to its app, which
/// `package:intl`'s `DateFormat` can back in a few lines. [of] finds the one for the ambient locale,
/// and falls back to English where the app has none.
///
/// Every date it formats is a calendar date: only its year, month and day are read. Weekdays are
/// numbered as `DateTime` numbers them, [DateTime.monday] (1) to [DateTime.sunday] (7).
abstract class TanreiDateLocalizations {
  /// Const constructor for subclasses.
  const TanreiDateLocalizations();

  /// The delegate of the built-in English localizations: add it to an app's
  /// `localizationsDelegates` so that an English locale's region (`en-GB`) chooses its forms.
  static const LocalizationsDelegate<TanreiDateLocalizations> delegate =
      _TanreiEnglishDateLocalizationsDelegate();

  /// The localizations of the nearest `Localizations`, or the built-in English ones where the app
  /// has none for its locale (the forms of `en-US`, or of the locale's region for English).
  static TanreiDateLocalizations of(BuildContext context) =>
      Localizations.of<TanreiDateLocalizations>(context, TanreiDateLocalizations) ??
      TanreiEnglishDateLocalizations.fallbackFor(Localizations.maybeLocaleOf(context));

  /// The narrow name of [weekday] (DTP-13): "S", "M" in English; "日", "月" in Japanese.
  String narrowWeekday(int weekday);

  /// The full name of [weekday]: "Sunday". A column header's name (DTP-13).
  String weekday(int weekday);

  /// The month and year (DTP-15): "September 2026", "2026年9月".
  String monthYear(int year, int month);

  /// The full date (DTP-36): "Thursday, September 17, 2026". A day's accessible name.
  String fullDate(DateTime date);

  /// A header's date (DTP-23): the abbreviated weekday, month and day ("Thu, Sep 17"), with the
  /// year where [withYear] ("Thu, Sep 17, 2026").
  String headerDate(DateTime date, {required bool withYear});

  /// A header's range end (DTP-23): the abbreviated month and day ("Sep 10"), with the year where
  /// [withYear].
  String headerMonthDay(DateTime date, {required bool withYear});

  /// [value] in the locale's digits, at least [minDigits] long (leading zeros).
  String formatNumber(int value, {int minDigits = 1}) => value.toString().padLeft(minDigits, '0');

  /// [text] with the locale's digits replaced by ASCII ones, for reading a typed date (DTP-26).
  String toAsciiDigits(String text) => text;

  /// The fields of the numeric date in the locale's order: month, day, year in `en-US`.
  List<TanreiDateField> get numericDateOrder;

  /// What separates the fields of the numeric date: "/" in `en-US`, "." in `de-DE`.
  String get numericDateSeparator;

  /// The first day of the week, where the localizations know it; null reads CLDR's week data
  /// for the locale ([tanreiFirstDayOfWeek]).
  int? get firstDayOfWeek => null;

  /// A date in the numeric form with a two-digit day and month and a four-digit year (DTP-26):
  /// "09/17/2026".
  String numericDate(DateTime date) => numericDateOrder
      .map(
        (TanreiDateField field) => switch (field) {
          TanreiDateField.year => formatNumber(date.year, minDigits: 4),
          TanreiDateField.month => formatNumber(date.month, minDigits: 2),
          TanreiDateField.day => formatNumber(date.day, minDigits: 2),
        },
      )
      .join(numericDateSeparator);

  /// The numeric date's pattern written with yyyy, mm and dd (DTP-25): "mm/dd/yyyy".
  String get numericDatePattern => numericDateOrder
      .map(
        (TanreiDateField field) => switch (field) {
          TanreiDateField.year => 'yyyy',
          TanreiDateField.month => 'mm',
          TanreiDateField.day => 'dd',
        },
      )
      .join(numericDateSeparator);

  // --- Times of day (the time picker, TMP-6, TMP-9, TMP-10, TMP-27) ---
  //
  // The members below have English defaults, so that localizations written before they existed
  // keep compiling. The patterns are CLDR's time patterns (`package:intl`'s `DateFormat.jm()`,
  // `DateFormat.Hm()` and `DateFormat('hm')` give them), read with the letters `h` (1–12), `K`
  // (0–11), `H` (0–23), `k` (1–24), `m` and `a` (the day period); text in single quotes is literal.

  /// The name of the period before noon, as a time shows it (TMP-10): "AM"; "午前" in Japanese.
  String get anteMeridiemAbbreviation => 'AM';

  /// The name of the period after noon (TMP-10): "PM"; "午後" in Japanese.
  String get postMeridiemAbbreviation => 'PM';

  /// The locale's preferred clock as its hour-and-minute pattern (CLDR's `jm` skeleton, TMP-6):
  /// "h:mm a" in `en-US`, "HH:mm" in `en-GB`, "H:mm" in Japanese. A pattern with `h` or `K` is a
  /// 12-hour clock, one with `H` or `k` a 24-hour clock.
  String get preferredHourMinutePattern => 'h:mm a';

  /// How the locale writes a time on the 12-hour clock (CLDR's `hm` skeleton): "h:mm a" in English,
  /// "aK:mm" in Japanese, "ah:mm" in Chinese, "a h:mm" in Korean. Where it writes the period `a`
  /// places the period selector (TMP-10); the hour letters' count and the text between the hour and
  /// the minutes give the hour's digits and the separator (TMP-9).
  String get hourMinutePattern12 => 'h:mm a';

  /// How the locale writes a time on the 24-hour clock (CLDR's `Hm` skeleton): "HH:mm" in English,
  /// "H:mm" in Japanese.
  String get hourMinutePattern24 => 'HH:mm';
}

/// What [pattern] (a CLDR time pattern) says, outside its quoted literals: whether its clock is a
/// 24-hour one (`H` or `k`), whether the day period `a` comes before the hour, how many letters
/// write the hour, and the text between the hour and the minutes (TMP-6, TMP-9, TMP-10).
@immutable
class TanreiTimePattern {
  /// Reads [pattern].
  factory TanreiTimePattern.parse(String pattern) {
    int? hourAt;
    int? periodAt;
    int hourDigits = 0;
    bool twentyFour = false;
    final StringBuffer separator = StringBuffer();
    bool afterHour = false;
    bool separatorDone = false;
    bool quoted = false;
    int position = 0;
    for (int i = 0; i < pattern.length; i++) {
      final String char = pattern[i];
      if (char == "'") {
        // '' is a literal quote.
        if (i + 1 < pattern.length && pattern[i + 1] == "'") {
          if (afterHour && !separatorDone) {
            separator.write("'");
          }
          i++;
          continue;
        }
        quoted = !quoted;
        continue;
      }
      if (!quoted && 'hHkK'.contains(char)) {
        hourAt ??= position;
        twentyFour = char == 'H' || char == 'k';
        hourDigits++;
        afterHour = true;
      } else if (!quoted && char == 'm') {
        separatorDone = afterHour;
      } else if (!quoted && (char == 'a' || char == 'b' || char == 'B')) {
        periodAt ??= position;
      } else if (afterHour && !separatorDone) {
        separator.write(char);
      }
      position++;
    }
    return TanreiTimePattern._(
      twentyFourHour: twentyFour,
      periodBeforeHour: periodAt != null && hourAt != null && periodAt < hourAt,
      hourDigits: hourDigits == 0 ? 1 : hourDigits,
      separator: separator.isEmpty ? ':' : separator.toString(),
    );
  }

  const TanreiTimePattern._({
    required this.twentyFourHour,
    required this.periodBeforeHour,
    required this.hourDigits,
    required this.separator,
  });

  /// Whether the pattern's clock runs 0–23 (or 1–24).
  final bool twentyFourHour;

  /// Whether the day period is written before the hour ("aK:mm"), not after the minutes.
  final bool periodBeforeHour;

  /// How many digits write the hour at least: 1 for "h", 2 for "HH".
  final int hourDigits;

  /// What separates the hour from the minutes: ":" in most locales, "." in some.
  final String separator;
}

/// The built-in English date localizations. The forms of `en-US` for a locale in the United States
/// (or without a region), and the day-first forms of British English elsewhere.
class TanreiEnglishDateLocalizations extends TanreiDateLocalizations {
  /// English date localizations for [locale].
  const TanreiEnglishDateLocalizations({this.locale = const Locale('en', 'US')});

  /// The English of the United States.
  static const TanreiEnglishDateLocalizations unitedStates = TanreiEnglishDateLocalizations();

  /// The English localizations a picker falls back to without a delegate for [locale]: its
  /// region's forms for an English locale, and those of `en-US` for any other language.
  static TanreiEnglishDateLocalizations fallbackFor(Locale? locale) =>
      locale != null && locale.languageCode == 'en'
      ? TanreiEnglishDateLocalizations(locale: locale)
      : unitedStates;

  /// The locale whose region chooses the forms.
  final Locale locale;

  static const List<String> _months = <String>[
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  static const List<String> _weekdays = <String>[
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ];

  /// The regions whose English writes the month before the day (CLDR).
  static const Set<String> _monthFirst = <String>{
    'US',
    'AS',
    'GU',
    'MP',
    'PR',
    'UM',
    'VI',
    'PH',
    'MH',
    'FM',
    'PW',
  };

  bool get _usForms => locale.countryCode == null || _monthFirst.contains(locale.countryCode);

  String _month(int month) => _months[month - 1];
  String _shortMonth(int month) => _months[month - 1].substring(0, 3);
  String _shortWeekday(int weekday) => _weekdays[weekday - 1].substring(0, 3);

  @override
  String narrowWeekday(int weekday) => _weekdays[weekday - 1].substring(0, 1);

  @override
  String weekday(int weekday) => _weekdays[weekday - 1];

  @override
  String monthYear(int year, int month) => '${_month(month)} $year';

  @override
  String fullDate(DateTime date) => _usForms
      ? '${weekday(date.weekday)}, ${_month(date.month)} ${date.day}, ${date.year}'
      : '${weekday(date.weekday)} ${date.day} ${_month(date.month)} ${date.year}';

  @override
  String headerDate(DateTime date, {required bool withYear}) {
    final String day = _usForms
        ? '${_shortWeekday(date.weekday)}, ${_shortMonth(date.month)} ${date.day}'
        : '${_shortWeekday(date.weekday)} ${date.day} ${_shortMonth(date.month)}';
    return withYear ? (_usForms ? '$day, ${date.year}' : '$day ${date.year}') : day;
  }

  @override
  String headerMonthDay(DateTime date, {required bool withYear}) {
    final String day = _usForms
        ? '${_shortMonth(date.month)} ${date.day}'
        : '${date.day} ${_shortMonth(date.month)}';
    return withYear ? (_usForms ? '$day, ${date.year}' : '$day ${date.year}') : day;
  }

  @override
  List<TanreiDateField> get numericDateOrder => _usForms
      ? const <TanreiDateField>[TanreiDateField.month, TanreiDateField.day, TanreiDateField.year]
      : const <TanreiDateField>[TanreiDateField.day, TanreiDateField.month, TanreiDateField.year];

  @override
  String get numericDateSeparator => '/';

  /// The English regions whose preferred clock is the 24-hour one (CLDR's `jm` pattern "HH:mm").
  static const Set<String> _twentyFourHour = <String>{
    'GB',
    'IE',
    'ZA',
    '150',
    'DE',
    'AT',
    'CH',
    'NL',
    'SE',
  };

  @override
  String get preferredHourMinutePattern =>
      _twentyFourHour.contains(locale.countryCode) ? 'HH:mm' : 'h:mm a';
}

class _TanreiEnglishDateLocalizationsDelegate
    extends LocalizationsDelegate<TanreiDateLocalizations> {
  const _TanreiEnglishDateLocalizationsDelegate();

  @override
  bool isSupported(Locale locale) => locale.languageCode == 'en';

  @override
  Future<TanreiDateLocalizations> load(Locale locale) =>
      SynchronousFuture<TanreiDateLocalizations>(TanreiEnglishDateLocalizations(locale: locale));

  @override
  bool shouldReload(_TanreiEnglishDateLocalizationsDelegate old) => false;
}

// CLDR's weekData `firstDay` (DTP-37), embedded because Flutter has no week data. Regions not
// listed start on Monday (CLDR's "001").
const String _sundayRegions =
    'AG AS BD BR BS BT BW BZ CA CN CO DM DO ET GT GU HK HN ID IL IN JM JP KE KH KR LA MH MM MO MT '
    'MX MZ NI NP PA PE PH PK PR PT PY SA SG SV TH TT TW UM US VE VI WS YE ZA ZW';
const String _saturdayRegions = 'AE AF BH DJ DZ EG IQ IR JO KW LY OM QA SD SY';

/// The region a language is most often written in, for a locale without one (CLDR's likely
/// subtags, for the common languages).
const Map<String, String> _likelyRegion = <String, String>{
  'en': 'US',
  'ja': 'JP',
  'zh': 'CN',
  'ko': 'KR',
  'ar': 'EG',
  'he': 'IL',
  'iw': 'IL',
  'fa': 'IR',
  'hi': 'IN',
  'bn': 'BD',
  'th': 'TH',
  'id': 'ID',
  'ms': 'MY',
  'vi': 'VN',
  'pt': 'BR',
  'es': 'ES',
  'fr': 'FR',
  'de': 'DE',
  'it': 'IT',
  'nl': 'NL',
  'ru': 'RU',
  'uk': 'UA',
  'pl': 'PL',
  'tr': 'TR',
  'sv': 'SE',
  'da': 'DK',
  'nb': 'NO',
  'fi': 'FI',
  'cs': 'CZ',
  'el': 'GR',
  'hu': 'HU',
  'ro': 'RO',
  'ur': 'PK',
  'am': 'ET',
  'my': 'MM',
  'km': 'KH',
  'lo': 'LA',
  'ne': 'NP',
  'fil': 'PH',
  'sw': 'KE',
  'zu': 'ZA',
  'af': 'ZA',
};

/// The first day of the week in [locale], from CLDR's week data (DTP-37): [DateTime.sunday] in
/// the United States and Japan, [DateTime.monday] in most of Europe, [DateTime.saturday] in much of
/// the Middle East. A locale without a region takes its language's likely one.
int tanreiFirstDayOfWeek(Locale locale) {
  final String? region = locale.countryCode ?? _likelyRegion[locale.languageCode];
  if (region == null) {
    return DateTime.monday;
  }
  if (_sundayRegions.split(' ').contains(region)) {
    return DateTime.sunday;
  }
  if (_saturdayRegions.split(' ').contains(region)) {
    return DateTime.saturday;
  }
  return region == 'MV' ? DateTime.friday : DateTime.monday;
}
