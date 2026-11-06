# Rural / Urban delivery — Games Planet

The Gamesplanet_in checkout opens the shared order-prefill page: https://gamesplanet13.github.io/arcade-accessories-/order-prefill.html

- House number missing: classify as Rural, regardless of manual Urban selection.
- Rural: prepaid only;
- Rural postage follows the packed-weight table below.
- Urban: normal shipping; COD only through Delhivery for eligible orders of ₹1,300 or more.
- The shared checkout displays Rural/Urban selection, calculates postage, and validates these rules before sending the order.

Keep future checkout changes consistent with this policy.

## Weight-based postal charges (packed parcel weight)

| Packed parcel | Post Office | Speed Post |
|---|---:|---:|
| 0–499 grams | ₹100 | ₹200 |
| 500 grams–1 kilogram | ₹150 | ₹300 |
| Above 1 kilogram | Confirm rate manually | Confirm rate manually |

These are **Games Planet customer-facing shipping charges**, not a claim about official India Post tariffs. Speed Post is double the corresponding Post Office charge. Use actual packed weight including packaging. Do not create a final price or accept payment for an over-1kg Rural shipment until the applicable shipping rate is confirmed.


## India-wide PIN code and office verification

A six-digit PIN code is **not exclusively Rural or Urban**: one PIN can include a Head/Sub Office and multiple Branch Offices. Do not maintain an invented list of exclusively Rural PIN codes.

When determining delivery eligibility:
- Keep the rule **missing house number → Rural**.
- If the customer selects a confirmed Branch Office (BO), treat it as Rural, even if manually marked Urban.
- If a PIN serves more than one post office, require the customer to select the exact office, village or locality.
- When office data is missing or ambiguous, retain the customer Rural/Urban choice subject to the missing-house rule, and verify serviceability before booking.
- The local GitHub PIN dataset is an offline aid, **not proof of live postal serviceability**.

Official verification: https://www.indiapost.gov.in/locate-postoffice

Official Department of Posts directory and office-type data: https://www.data.gov.in/catalog/all-india-pincode-directory-through-webservice

Source explaining mixed rural/urban PINs: https://sansad.in/getFile/loksabhaquestions/annex/10/AU3504.pdf?source=pqals

Example: PIN 244901 (Rampur) is shared by Rampur H.O. and multiple Branch Offices, so it cannot be categorised by PIN alone.
