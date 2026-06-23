# Noesis Firestore Collections

Noesis stores all user-owned data under:

```txt
/users/{uid}
```

Prototype mode uses:

```txt
/users/anonymous-scholar
```

## Collections

```txt
/users/{uid}/media/{mediaId}
/users/{uid}/concepts/{conceptId}
/users/{uid}/questions/{questionId}
/users/{uid}/vault/{beliefId}
/users/{uid}/drafts/{draftId}
/users/{uid}/practices/{practiceId}
/users/{uid}/atlasMaps/{atlasMapId}
/users/{uid}/timeline/{eventId}
/users/{uid}/insights/{insightId}
```

## Settings Documents

```txt
/users/{uid}/settings/goal
/users/{uid}/settings/atlasView
/users/{uid}/settings/atlasNodes
/users/{uid}/settings/schema
```

## Collection Purposes

`media` stores books, audiobooks, podcasts, videos, movies, articles, courses, lectures, documentaries, interviews, conversations, papers, and other source inputs.

`concepts` stores encyclopedia entries and Atlas nodes. Concept records include descriptions, saved concept links, and Auto Map positions.

`questions` stores manual answer-workspace questions. Source capture questions and annotation questions can also be derived from `media`.

`vault` stores positions, principles, mental models, life rules, worldview statements, and ideas created from the Positions page.

`drafts` stores Works outputs: essays, scripts, and field notes.

`practices` stores behavior-facing outputs: habits, experiments, disciplines, reflection prompts, commitments, observation periods, personal rules, and challenges.

`atlasMaps` stores saved Custom Maps inside Atlas. Each custom map has selected concept nodes, node positions, typed user-created links, and auto-link filters for shared sources, positions, inquiries, works, practices, and saved concept links.

`timeline` stores evolution/history events for positions, concepts, inquiries, works, practices, media, and insights.

`insights` stores mirrored idea records used for Atlas/concept linking when an idea is created as a belief.

`settings/goal` stores editable per-media-type goals.

`settings/atlasView` stores map pan/zoom defaults.

`settings/atlasNodes` stores map-level node position metadata when positions are not stored directly on concept records.

`settings/schema` stores the current Noesis collection map for Firebase Studio visibility and migration checks.

## Runtime Scaffolding

On app load, Studio creates these user documents if they are missing:

- `/users/{uid}`
- `/users/{uid}/settings/goal`
- `/users/{uid}/settings/atlasView`
- `/users/{uid}/settings/atlasNodes`
- `/users/{uid}/settings/schema`

The scaffold does not overwrite existing goal or Atlas settings.

## Terminal Schema Seed

The machine-readable schema is stored at:

```txt
docs/firestore.schema.json
```

To scaffold the Firestore collection shape from Firebase Studio:

```bash
npm run firestore:schema
```

To scaffold a real signed-in user instead of prototype mode:

```bash
npm run firestore:schema -- YOUR_FIREBASE_AUTH_UID
```

The script creates `/users/{uid}`, settings docs, and a `_schema` placeholder document in each collection. It does not overwrite existing placeholder docs.
