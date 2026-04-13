---
kind: stack
name: ios-xcode
loads_from: src/fr/CLAUDE.md §10
triggers: xcode, ios, tvos, swift, swiftui, xcodebuild, simctl, xcrun
---

# Stack — iOS / tvOS + Xcode

> Chargé si le projet contient Xcode, Swift, SwiftUI, xcodebuild ou simctl.
> Pré-requis : Xcode installé. Tout le reste peut tourner depuis VS Code.

## Philosophie du workflow

80–95 % du dev se fait dans VS Code + Claude Code.
Xcode intervient uniquement là où Apple reste incontournable.

```text
Claude Code / VS Code
      ↓
Makefile / scripts
      ↓
xcodebuild + simctl
      ↓
Simulator iOS / tvOS
      ↓
Xcode (signing, device, archive, LLDB, Instruments)
```

## Conventions Swift

- `async/await` — pas de Combine legacy sauf besoin explicite
- Architecture MVVM + Services + local Swift Packages
- Une Preview par View SwiftUI
- Logique métier dans `Packages/CoreKit` si possible
- Tests unitaires dans `*Tests/`
- `async let` pour la concurrence, `@MainActor` pour les mutations UI

## Commandes standard

```bash
make run       # build + install + launch iOS simulator
make tvrun     # build + install + launch tvOS simulator
make sim       # build iOS simulator seulement
make tvsim     # build tvOS simulator seulement
make test      # tests unitaires
make doctor    # diagnostic setup (xcode, swift, simulateurs)
make devices   # liste devices disponibles
make device DEVICE_ID=<udid>  # build device réel
make archive   # archive App Store
make clean     # nettoyage .build/
make logs      # logs de build
```

## Quand ouvrir Xcode

| Cas | Outil |
| --- | --- |
| Coder / refactorer / générer | VS Code + Claude Code |
| Build + simulateur | `make run` |
| Tests unitaires | `make test` |
| Signing / capabilities | Xcode obligatoire |
| Device physique | Xcode obligatoire |
| LLDB / Instruments | Xcode obligatoire |
| Archive + TestFlight | Xcode obligatoire |

## Pré-requis à vérifier (`make doctor`)

```bash
xcodebuild -version   # Xcode installé
swift --version       # Swift CLI dispo
xcpretty --version    # gem install xcpretty
claude --version      # Claude Code CLI
xcrun simctl list devices available  # simulateurs
```

## Extensions VS Code recommandées

| Extension | ID |
| --- | --- |
| Swift | `sswg.swift-lang` |
| Continue | `continue.continue` |
| Error Lens | `usernamehakki.error-lens` |
| GitLens | `eamodio.gitlens` |

## Problèmes fréquents

| Problème | Cause | Fix |
| --- | --- | --- |
| `xcpretty: command not found` | non installé | `gem install xcpretty` |
| app ne se lance pas après build OK | mauvais bundle id | corriger `BUNDLE_ID_IOS` dans Makefile |
| simulateur ne boot pas | état incohérent | `xcrun simctl shutdown all` |
| provisioning error | signing Apple | ouvrir Xcode → corriger Team/Signing |
| LSP Swift lent | indexation en cours | attendre ou relancer extension |

## Prompts utiles pour Claude

```text
# Refactor SwiftUI
Refactor this SwiftUI screen into smaller reusable components.
Keep previews. Preserve current behavior.

# MVVM
Reorganize this feature into MVVM.
Move side effects to Services, keep the View simple.

# Tests
Generate unit tests for this service. Cover success + failure cases.

# Performance
Review this SwiftUI view for unnecessary re-renders.

# Package extraction
Move the business logic into a local Swift Package named CoreKit.
```

## CLAUDE.md recommandé pour un projet iOS

```markdown
## Projet iOS
- Plateformes : iOS 17+ / tvOS 17+
- Langage : Swift 5.9+
- UI : SwiftUI
- Architecture : MVVM + Services + local Swift Packages
- Schemes iOS : [nom]  tvOS : [nom]
- Simulateurs : iPhone 15 Pro / Apple TV 4K (3rd gen)
- Ne pas modifier : structure .xcodeproj, signing, Info.plist
```
