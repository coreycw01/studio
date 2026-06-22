# Readex Firestore Collections

Readex stores all user-owned data under:

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

`concepts` stores encyclopedia entries and Atlas nodes. Concept records include descriptions, manual branch links, and saved map positions.

`questions` stores manual answer-workspace questions. Source capture questions and annotation questions can also be derived from `media`.

`vault` stores beliefs, principles, mental models, life rules, worldview claims, and ideas created from the Beliefs page.

`drafts` stores writing outputs: essays, scripts, and field notes.

`timeline` stores evolution/history events for beliefs, concepts, questions, drafts, media, and insights.

`insights` stores mirrored idea records used for Atlas/concept linking when an idea is created as a belief.

`settings/goal` stores editable per-media-type goals.

`settings/atlasView` stores map pan/zoom defaults.

`settings/atlasNodes` stores map-level node position metadata when positions are not stored directly on concept records.

`settings/schema` stores the current Readex collection map for Firebase Studio visibility and migration checks.

## Runtime Scaffolding

On app load, Studio creates these user documents if they are missing:

- `/users/{uid}`
- `/users/{uid}/settings/goal`
- `/users/{uid}/settings/atlasView`
- `/users/{uid}/settings/atlasNodes`
- `/users/{uid}/settings/schema`

The scaffold does not overwrite existing goal or Atlas settings.
