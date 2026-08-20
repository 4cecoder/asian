---
id: t06-scenario-fsm
title: "Cluster 3: Travel Scenario State Machines & Transition Engines"
track: "Track 6: Edge LLM Orchestration, Real-Time Conversational Roleplay & Prompt Engineering"
task_range: "TASK-121–TASK-130"
status: complete
tags: [fsm, scenarios, roleplay, backend]
related: [t06-prompt-personas, t06-difficulty-adaptation]
---

# Cluster 3: Travel Scenario State Machines & Transition Engines

A base finite-state-machine engine plus eight concrete travel scenario
FSMs (bargaining, food ordering, taxi, hotel check-in, social/nightlife,
pharmacy emergency, transit, scooter rental), and a state-persistence
layer that supports rewinding/retrying a scenario branch.

## Tasks

| ID       | Title                                                                | Depends on        | Spec (condensed)                                                                                                                                                                                                                                    | Acceptance check                                                                                                               |
| -------- | -------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| TASK-121 | Finite State Machine (FSM) Base Architecture & Transition Guard      | None              | `scenarios/fsm_engine.py`: `BaseScenarioFSM`. Attributes: `current_state`, `allowed_transitions: dict[str, list[str]]`, `state_context: dict`. Methods: `transition_to(target_state, guard_fn)`, `get_prompt_constraints() -> str`.                 | `uv run pytest tests/scenarios/test_fsm_engine.py -v` verifies invalid transitions rejected, entry/exit hooks fire.            |
| TASK-122 | Night Market Bargaining FSM (Offer → Counter → Walk-Away → Deal)     | TASK-121          | `scenarios/bargaining_fsm.py`: States GREETING, INQUIRE_PRICE, INITIAL_OFFER, VENDOR_COUNTER, SECOND_OFFER, WALK_AWAY_BLUFF, DEAL_AGREED, PAYMENT_METHOD, DEAL_REJECTED. Guard: blocks DEAL_AGREED if discount > 70% without intermediate counters. | `uv run pytest tests/scenarios/test_bargaining_fsm.py -v` verifies progression through all stages based on extracted intent.   |
| TASK-123 | Street Food & Izakaya Ordering FSM (Dietary, Spiciness, Bills)       | TASK-121          | `scenarios/food_ordering_fsm.py`: States TABLE_REQUEST, MENU_INQUIRY, SPECIALTY_RECOMMENDATION, DIETARY_ALLERGY_CHECK, SPICE_LEVEL_SELECTION, ORDER_CONFIRMATION, MID_MEAL_ADDON, BILL_SPLIT_PAYMENT.                                               | `uv run pytest tests/scenarios/test_food_ordering_fsm.py -v` verifies spice-level selection and allergy-acknowledgment guards. |
| TASK-124 | Taxi & Tuk-Tuk Navigation FSM (Destination, Meter, Drop-Off)         | TASK-121          | `scenarios/taxi_navigation_fsm.py`: States HAIL_TAXI, STATE_DESTINATION, METER_OR_FLAT_NEGOTIATION, ROUTE_PREFERENCE, LIVE_CORRECTION, PAYMENT_CHANGE.                                                                                              | `uv run pytest tests/scenarios/test_taxi_fsm.py -v` tests meter-refusal and navigation-directive transitions.                  |
| TASK-125 | Hotel & Airbnb Villa Check-In FSM (Keycards, Amenities, Requests)    | TASK-121          | `scenarios/hotel_checkin_fsm.py`: States CHECKIN_GREETING, RESERVATION_CONFIRMATION, PASSPORT_DEPOSIT, AMENITY_INQUIRY, SPECIAL_REQUEST, ROOM_KEY_HANDOFF.                                                                                          | `uv run pytest tests/scenarios/test_hotel_fsm.py -v` validates passport/ID check step and key handoff completion.              |
| TASK-126 | Nightlife & Social Introductions FSM (Drinks, Icebreakers, Exchange) | TASK-121          | `scenarios/social_dating_fsm.py`: States OPENING_ICEBREAKER, ORIGIN_AND_OCCUPATION, TRAVEL_PLANS_SHARING, FOOD_MUSIC_RECOMMENDATIONS, CULTURAL_EXCHANGE, CONTACT_EXCHANGE, POLITE_DEPARTURE.                                                        | `uv run pytest tests/scenarios/test_social_fsm.py -v` asserts natural topic progression, no abrupt endings.                    |
| TASK-127 | Pharmacy & Medical Emergency FSM (Symptoms, Allergies, Dosage)       | TASK-121          | `scenarios/emergency_fsm.py`: States TRIAGE_GREETING, SYMPTOM_DESCRIPTION, DURATION_AND_SEVERITY, ALLERGY_HISTORY, MEDICATION_RECOMMENDATION, DOSAGE_INSTRUCTIONS, PURCHASE.                                                                        | `uv run pytest tests/scenarios/test_emergency_fsm.py -v` verifies symptom clarification and dosage-explanation transitions.    |
| TASK-128 | Transit & Train Station Navigation FSM (IC Cards, Transfers, Delays) | TASK-121          | `scenarios/transit_fsm.py`: States TICKET_COUNTER_GREETING, DESTINATION_SELECTION, TICKET_TYPE, PLATFORM_TRANSFER_INQUIRY, DELAY_ANNOUNCEMENT_HANDLING, GATE_EXIT.                                                                                  | `uv run pytest tests/scenarios/test_transit_fsm.py -v` validates platform-transfer inquiry branch.                             |
| TASK-129 | Scooter Rental & Fueling FSM (Deposit, Inspection, Gas Stations)     | TASK-121          | `scenarios/scooter_rental_fsm.py`: States RENTAL_INQUIRY, DURATION_AND_ENGINE_SIZE, HELMET_INSURANCE_ADDON, DAMAGE_INSPECTION, FUEL_TYPE_EXPLANATION (91/95 octane), GAS_STATION_INTERACTION, RETURN_INSPECTION.                                    | `uv run pytest tests/scenarios/test_scooter_fsm.py -v` tests inspection and fueling dialogue branches.                         |
| TASK-130 | FSM State Persistence, Snapshotting & Rollback Handler               | TASK-121…TASK-129 | `scenarios/state_store.py`: `FSMStateStore` serializes full state-machine snapshots per turn, enabling "Rewind Turn"/"Retry Scenario Branch" without resetting the whole conversation.                                                              | `uv run pytest tests/scenarios/test_state_store.py -v` verifies snapshot restoration to exact prior state.                     |

## Related packages

- [[t06-prompt-personas]] — each FSM's `get_prompt_constraints()` feeds the `[CURRENT SCENARIO STATE]` section of the system prompt.
- [[t06-difficulty-adaptation]] — TASK-150's branch router re-routes these FSMs based on adaptive difficulty signals.
