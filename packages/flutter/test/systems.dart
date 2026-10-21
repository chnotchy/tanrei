import 'package:tanrei/systems/cupertino.dart';
import 'package:tanrei/systems/m3_like.dart';
import 'package:tanrei/tanrei.dart';

/// Every design system the package ships: the default and the presets. They are values of the same
/// vocabulary types, so one test body runs over all of them.
const List<TanreiSystem> shippedSystems = <TanreiSystem>[
  tanreiSystem,
  m3LikeSystem,
  cupertinoSystem,
];

/// The six color schemes of [system], by name.
Map<String, TanreiColors> schemesOf(TanreiSystem system) => <String, TanreiColors>{
  'light': system.schemes.light,
  'lightMedium': system.schemes.lightMedium,
  'lightHigh': system.schemes.lightHigh,
  'dark': system.schemes.dark,
  'darkMedium': system.schemes.darkMedium,
  'darkHigh': system.schemes.darkHigh,
};

/// The roles [paint] reads, through mixes and alphas.
Set<TanreiColorRole> rolesOfPaint(TanreiPaint paint) => switch (paint) {
  TanreiRolePaint(:final TanreiColorRole role) => <TanreiColorRole>{role},
  TanreiMixPaint(:final TanreiPaint base, :final TanreiPaint other) => <TanreiColorRole>{
    ...rolesOfPaint(base),
    ...rolesOfPaint(other),
  },
  TanreiAlphaPaint(:final TanreiPaint of) => rolesOfPaint(of),
  TanreiNoPaint() || TanreiLiteralPaint() => <TanreiColorRole>{},
  final TanreiSchemePaint perScheme => <TanreiColorRole>{
    for (final TanreiScheme scheme in TanreiScheme.values) ...rolesOfPaint(perScheme.of(scheme)),
  },
};

/// Every variant of the button tokens — the core ones and those a design system added — by key.
Map<String, TanreiButtonVariantTokens> buttonVariantsOf(TanreiButtonTokens tokens) =>
    <String, TanreiButtonVariantTokens>{
      for (final TanreiButtonVariant variant in tokens.variants.keys)
        variant.name: tokens.variants[variant],
    };

/// Every color role that a component token, an elevation level or a primitive of [system] reads,
/// keyed by where it is read from.
Map<String, Set<TanreiColorRole>> referencedRoles(TanreiSystem system) {
  final Map<String, Set<TanreiColorRole>> roles = <String, Set<TanreiColorRole>>{
    'focus ring': <TanreiColorRole>{TanreiColorRole.focusRing, TanreiColorRole.focusRingInner},
  };
  final Map<String, List<TanreiShadowLayer>> levels = <String, List<TanreiShadowLayer>>{
    'level0': system.elevation.level0,
    'level1': system.elevation.level1,
    'level2': system.elevation.level2,
    'level3': system.elevation.level3,
    'level4': system.elevation.level4,
    'level5': system.elevation.level5,
    ...system.elevation.extra,
  };
  for (final MapEntry<String, List<TanreiShadowLayer>> level in levels.entries) {
    roles['sys.elevation.${level.key}'] = <TanreiColorRole>{
      for (final TanreiShadowLayer layer in level.value) layer.role,
    };
  }
  for (final MapEntry<String, TanreiButtonVariantTokens> variant in buttonVariantsOf(
    system.button,
  ).entries) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiButtonVariantStateTokens tokens = variant.value.of(state);
      roles['comp.button.${variant.key}.${state.name}'] = <TanreiColorRole>{
        ...rolesOfPaint(tokens.containerColor),
        ...rolesOfPaint(tokens.labelColor),
        ...rolesOfPaint(tokens.outlineColor),
        for (final TanreiShadowLayer layer in tokens.containerElevation) layer.role,
      };
    }
  }
  for (final TanreiIconButtonVariant variant in system.iconButton.variants.keys) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiIconButtonVariantStateTokens tokens = system.iconButton.variants[variant].of(
        state,
      );
      roles['comp.icon-button.${variant.name}.${state.name}'] = <TanreiColorRole>{
        for (final TanreiPaint paint in <TanreiPaint>[
          tokens.containerColor,
          tokens.iconColor,
          tokens.outlineColor,
          tokens.stateLayerColor,
          tokens.unselectedContainerColor,
          tokens.unselectedIconColor,
          tokens.unselectedOutlineColor,
          tokens.unselectedStateLayerColor,
          tokens.selectedContainerColor,
          tokens.selectedIconColor,
          tokens.selectedOutlineColor,
          tokens.selectedStateLayerColor,
        ])
          ...rolesOfPaint(paint),
      };
    }
  }
  roles['comp.divider'] = rolesOfPaint(system.divider.lineColor);
  roles['comp.progress-indicator'] = <TanreiColorRole>{
    ...rolesOfPaint(system.progressIndicator.trackColor),
    ...rolesOfPaint(system.progressIndicator.indicatorColor),
  };
  roles['comp.loading-indicator'] = <TanreiColorRole>{
    for (final TanreiPaint paint in <TanreiPaint>[
      system.loadingIndicator.indicatorColor,
      system.loadingIndicator.containedContainerColor,
      system.loadingIndicator.containedIndicatorColor,
    ])
      ...rolesOfPaint(paint),
    for (final TanreiShadowLayer layer in system.loadingIndicator.containedContainerElevation)
      layer.role,
  };
  roles['comp.badge'] = <TanreiColorRole>{
    for (final TanreiPaint paint in <TanreiPaint>[
      system.badge.containerColor,
      system.badge.labelColor,
      system.badge.outlineColor,
    ])
      ...rolesOfPaint(paint),
  };
  for (final TanreiCheckboxCondition condition in system.checkbox.conditions.keys) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiCheckboxConditionStateTokens tokens = system.checkbox.conditions[condition].of(
        state,
      );
      roles['comp.checkbox.${condition.name}.${state.name}'] = <TanreiColorRole>{
        for (final TanreiPaint paint in <TanreiPaint>[
          tokens.containerColor,
          tokens.boxColor,
          tokens.markColor,
          tokens.outlineColor,
          tokens.labelColor,
          tokens.stateLayerColor,
        ])
          ...rolesOfPaint(paint),
      };
    }
  }
  for (final TanreiRadioButtonCondition condition in system.radioButton.conditions.keys) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiRadioButtonConditionStateTokens tokens = system.radioButton.conditions[condition]
          .of(state);
      roles['comp.radio-button.${condition.name}.${state.name}'] = <TanreiColorRole>{
        for (final TanreiPaint paint in <TanreiPaint>[
          tokens.containerColor,
          tokens.ringColor,
          tokens.dotColor,
          tokens.labelColor,
          tokens.stateLayerColor,
        ])
          ...rolesOfPaint(paint),
      };
    }
  }
  for (final TanreiSwitchCondition condition in system.switch_.conditions.keys) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiSwitchConditionStateTokens tokens = system.switch_.conditions[condition].of(
        state,
      );
      roles['comp.switch.${condition.name}.${state.name}'] = <TanreiColorRole>{
        for (final TanreiPaint paint in <TanreiPaint>[
          tokens.containerColor,
          tokens.trackColor,
          tokens.outlineColor,
          tokens.handleColor,
          tokens.iconColor,
          tokens.labelColor,
          tokens.stateLayerColor,
        ])
          ...rolesOfPaint(paint),
        for (final TanreiShadowLayer layer in tokens.handleElevation) layer.role,
      };
    }
  }
  for (final TanreiFabVariant variant in system.fab.variants.keys) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiFabVariantStateTokens tokens = system.fab.variants[variant].of(state);
      roles['comp.fab.${variant.name}.${state.name}'] = <TanreiColorRole>{
        for (final TanreiPaint paint in <TanreiPaint>[
          tokens.containerColor,
          tokens.iconColor,
          tokens.stateLayerColor,
        ])
          ...rolesOfPaint(paint),
        for (final TanreiShadowLayer layer in tokens.containerElevation) layer.role,
      };
    }
  }
  for (final TanreiExtendedFabVariant variant in system.extendedFab.variants.keys) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiExtendedFabVariantStateTokens tokens = system.extendedFab.variants[variant].of(
        state,
      );
      roles['comp.extended-fab.${variant.name}.${state.name}'] = <TanreiColorRole>{
        for (final TanreiPaint paint in <TanreiPaint>[
          tokens.containerColor,
          tokens.labelColor,
          tokens.stateLayerColor,
        ])
          ...rolesOfPaint(paint),
        for (final TanreiShadowLayer layer in tokens.containerElevation) layer.role,
      };
    }
  }
  for (final TanreiChipVariant variant in system.chip.variants.keys) {
    for (final TanreiInteractionState state in TanreiInteractionState.values) {
      final TanreiChipVariantStateTokens tokens = system.chip.variants[variant].of(state);
      roles['comp.chip.${variant.name}.${state.name}'] = <TanreiColorRole>{
        for (final TanreiPaint paint in <TanreiPaint>[
          tokens.containerColor,
          tokens.outlineColor,
          tokens.labelColor,
          tokens.iconColor,
          tokens.stateLayerColor,
          tokens.removeContainerColor,
          tokens.removeIconColor,
          tokens.removeStateLayerColor,
          tokens.selectedContainerColor,
          tokens.selectedOutlineColor,
          tokens.selectedLabelColor,
          tokens.selectedIconColor,
          tokens.selectedStateLayerColor,
        ])
          ...rolesOfPaint(paint),
        for (final TanreiShadowLayer layer in <TanreiShadowLayer>[
          ...tokens.containerElevation,
          ...tokens.selectedContainerElevation,
        ])
          layer.role,
      };
    }
  }
  return roles;
}

/// `<where>: <role> (<scheme>)` for every referenced role a scheme of [system] does not define.
List<String> unknownRoles(TanreiSystem system) => <String>[
  for (final MapEntry<String, Set<TanreiColorRole>> entry in referencedRoles(system).entries)
    for (final TanreiColorRole role in entry.value)
      for (final MapEntry<String, TanreiColors> scheme in schemesOf(system).entries)
        if (!scheme.value.has(role)) '${entry.key}: ${role.name} (${scheme.key})',
];
