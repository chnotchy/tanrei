import 'package:flutter/widgets.dart';

/// The direction of [text] by its first strong character (what the web's `dir="auto"` does), or
/// null when it has none: typed text keeps its own direction in a field (TXF-24), a search's input
/// (SRC-4) as a text field's.
TextDirection? tanreiTextDirectionOf(String text) {
  final RegExpMatch? strong = _strong.firstMatch(text);
  if (strong == null) {
    return null;
  }
  return _rightToLeft.hasMatch(strong.group(0)!) ? TextDirection.rtl : TextDirection.ltr;
}

final RegExp _strong = RegExp(r'\p{L}', unicode: true);
final RegExp _rightToLeft = RegExp(
  r'[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}'
  r'\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\p{Script=Hanifi_Rohingya}]',
  unicode: true,
);
