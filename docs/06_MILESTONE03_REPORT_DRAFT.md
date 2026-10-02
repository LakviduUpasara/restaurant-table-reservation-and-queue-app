# DineFlow Milestones 01–03 consolidated report draft

**Status:** Working draft. Do not submit until actual screenshots, builds, functional logs, usability sessions, and member review are complete. Target: no more than 35 pages including cover; references and appendices follow the assignment rule.

## Cover

IT3060 Human Computer Interaction · Milestones 01–03 Final Report · Restaurant Table Reservation and Queue App for Busy Eateries · Group WE_42 · DineFlow. Add the four members' verified IDs, names, and actual implementation contributions.

## Executive summary and prior milestones

Milestone 01 identified unclear table availability, long waits, and physical queues through a 17-person customer survey and staff/owner interviews. Milestone 02 translated the requirements into customer, staff, and owner prototypes and tested them with five users. The implemented version uses two mobile apps sharing one API and database. Summarize the original evidence concisely and cite the group's Milestone 01 and 02 reports.

## Technology and architecture

Expo and React Native provide installable cross-platform apps; TypeScript and shared packages keep data shapes and the visual system consistent. Express centralizes booking, queue, authorization, and conflict rules. Supabase provides PostgreSQL, Auth, Realtime, and storage capability. The Customer and Operations apps use only public Supabase configuration; a protected backend holds the service-role key. Explain development and deployment environments actually used.

## Implementation and fidelity

Insert screenshots of **working app** screens beside the relevant high-fidelity Figma frames. Use `04_IMPLEMENTATION_TRACEABILITY.md` as the requirements → prototype → implementation → test matrix. Document deviations: unified email recovery, stronger table-ready notification, labelled walk-in wait field, product price field, combined owner summary, and last-updated/offline feedback. Add any further differences after frame-by-frame review; detailed Figma context retrieval was rate-limited during initial implementation.

## Tests and results

Use `05_TEST_CASES.md` for functional cases. Add executed steps, build/version, actual outcomes, screenshots/logs, defect references, and retest outcomes. For usability, recruit at least five real or proxy participants and record consent, role, tasks, completion, time, errors, SEQ, SUS, qualitative feedback, and issue fixes. **Do not copy Milestone 02 prototype metrics as working-app results.**

## Schedule, conclusion and appendices

Add the actual group timeline and Gantt chart, lessons learned, deployment/build evidence, links to the version-controlled repository and Figma, full test logs, consent records, and recordings as appropriate. Review privacy of participant and customer details before submission.
