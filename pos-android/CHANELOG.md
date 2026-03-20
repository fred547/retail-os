# Changelog

## [Unreleased]
### Added 9-12-2024 v8
- Added `TextWatcher` for `textInputCashAmount` and `textInputVoucherAmount` to update `textInputCardAmount` based on the entered values.
- Ensured `textInputCardAmount` is updated to 2 decimal places.
- Allowed `textInputCardAmount` to be zero.
- Allowed the user to change the `textInputCardAmount` after entering `textInputCashAmount` or `textInputVoucherAmount`.

### Fixed
- Resolved the issue where `cardAmountTextWatcher` was not defined before use.