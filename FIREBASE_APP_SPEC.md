# Readex Firebase App Spec

Readex is a personal philosophy operating system. Its product center is not reading progress or a bookshelf. The center is the user's evolving map of concepts, questions, beliefs, and writing. Media sources are inputs. Annotations and captured thoughts are evidence. Beliefs, drafts, answers, and timeline changes are outputs.

The Firebase Studio app is the production/mobile-ready version of the richer local prototype. It should keep the Next.js, Firebase, Radix, and Tailwind architecture while preserving the prototype's mental model and workflows.

## Product Principles

- Ideas are the product. Books, videos, podcasts, movies, papers, conversations, and articles feed the idea system.
- Each sidebar tab has one obvious job.
- Cross-links should provide context without constantly navigating the user away from the current workspace.
- Concepts are shared tags and encyclopedia entries, not just visual graph nodes.
- `Unsorted Ideas` is a fallback concept used only when no real concept has been selected.
- Beliefs are explicit philosophy claims and are the home for ideas the user creates.
- Writing is a real studio for essays, scripts, and field notes, not a prompt gallery.
- Atlas is the only primary place where the map, branches, and connection explanation are the focus.

## Sidebar Tabs

The primary sidebar should show:

1. Atlas
2. Concepts
3. Questions
4. Library
5. Beliefs
6. Writing
7. Evolution

The old `Connections` tab should not be a primary tab. Its function belongs inside Atlas as map filters, branching controls, and the selected-node evidence panel.

## Atlas

Purpose: the visual map, web, and branching surface.

Atlas should open directly to the concept map. It should not mirror the last visited tab. It should not be pre-populated with universal philosophy starter concepts such as "Consciousness" unless the user created/imported them.

Core features:

- Render concept nodes from saved concepts and concept tags found across the user's data.
- Show relationship lines when two concepts share evidence, beliefs, drafts, questions, or source material.
- Lines should visually touch node edges.
- Clicking a node stays inside Atlas and updates the selected-node panel.
- The selected-node panel shows linked inputs and outputs.
- Users can create a new concept from Atlas.
- Users can branch one concept to another.
- The "branch this concept" dropdown starts blank so the user has to intentionally choose a target concept.
- Atlas supports zooming and should eventually persist pan/zoom/layout under settings.

Selected-node panel:

- Concept summary/description
- Shared evidence counts
- Linked sources
- Linked annotations
- Linked questions
- Linked beliefs/ideas
- Linked drafts
- Linked timeline events
- Manual branch links

Firestore:

- Concepts: `/users/{uid}/concepts/{conceptId}`
- Atlas view settings: `/users/{uid}/settings/atlasView`
- Atlas node positions: `/users/{uid}/settings/atlasNodes`

## Concepts

Purpose: the encyclopedia of concepts.

Concepts are not the map page. Concept cards should open a concept detail dialog, not route the user to Atlas.

Core features:

- Search concepts.
- Filter concepts by how much linked material they have.
- Create, edit, and delete concepts.
- Concept cards show counts for linked sources, annotations, questions, beliefs, drafts, and evolution events.
- Count chips open the concept dialog focused on the relevant section.
- Concept detail dialog shows both inputs and outputs.

Inputs:

- Sources
- Annotations
- Questions

Outputs:

- Ideas/beliefs
- Writing drafts
- Evolution events

Concept tag behavior:

- Every tag is normalized to title case.
- If no concept is selected, `Unsorted Ideas` is selected automatically.
- If a real concept is selected, `Unsorted Ideas` is removed automatically.
- If all real concepts are removed, `Unsorted Ideas` returns automatically.

Firestore:

- `/users/{uid}/concepts/{conceptId}`
- Concept names are also inferred from tags on media, beliefs, insights, drafts, and questions.

## Questions

Purpose: answer workspace.

Questions should help the user answer hard problems, not just store a list of prompts.

Core features:

- First fold shows active questions and answer progress.
- Search and filters are secondary controls.
- Clicking a question opens a workspace.
- Workspace includes a working answer editor.
- Users can save answers back to Firestore.
- Workspace shows evidence and related context.

Question workspace sections:

- Working answer
- Evidence for/against or relevant source material
- Related sources
- Related concepts
- Related beliefs
- Related drafts

Sources of questions:

- Manual questions saved in `/questions`
- Open questions captured before starting a source
- Question-type annotations attached to sources

Firestore:

- `/users/{uid}/questions/{questionId}`
- Source capture questions live inside `/users/{uid}/media/{mediaId}.capture.before`
- Annotation questions live inside `/users/{uid}/media/{mediaId}.annotations`

## Library

Purpose: source/input capture.

Library is for books, audiobooks, podcasts, videos, movies, articles, courses, lectures, documentaries, interviews, conversations, papers, and other source types. The app should not group different media types into one vague goal count.

Core features:

- Add/edit/delete source items.
- Filter by media type, status, concept tag, and text search.
- Source cards show title, creator, media type, status, concept tags, annotation count, and linked belief count.
- Source detail view emphasizes capture and extraction.

Source detail sections:

- Metadata
- Consumption status
- Concept tags
- Before-consuming capture
- After-consuming capture
- Session notes
- Annotations
- Linked ideas/beliefs
- Edit/delete actions

Capture fields:

- Why this source matters
- Open question before starting
- Open answer or hypothesis before starting
- What changed after consuming it
- Remaining questions after consuming it

Annotations:

- Types: highlight, thought, question, connection
- Text
- Location/page/timecode
- Concept tags
- Optional answer for question annotations
- Date

Firestore:

- `/users/{uid}/media/{mediaId}`

## Beliefs

Purpose: explicit philosophy claims and the home for created ideas.

The Beliefs tab is where user-created ideas should go. A `+ Idea` action creates a belief entry and may also create a mirrored insight record for Atlas and concept linking.

Belief types:

- belief
- principle
- mental_model
- life_rule
- worldview

Core features:

- Create idea/belief.
- Edit/delete belief.
- Show belief statement, description, confidence, status, and type.
- Link beliefs to concepts, sources, drafts, questions, and timeline events.
- Store evidence for and evidence against.
- Track version history when a belief changes.

Belief detail sections:

- Statement
- Description
- Confidence
- Status
- Evidence for
- Evidence against
- Linked concepts
- Linked sources
- Linked writing
- Version history/evolution

Idea creation behavior:

- `+ Idea` creates a `VaultEntry`.
- It may also create an `Insight` mirror for graph/Atlas evidence.
- It creates a timeline event such as `Idea formed`.
- It ensures any selected concept tags exist as concept documents.

Firestore:

- `/users/{uid}/vault/{beliefId}`
- Optional mirror: `/users/{uid}/insights/{insightId}`
- Timeline event: `/users/{uid}/timeline/{eventId}`

## Writing

Purpose: real writing studio.

Writing is where philosophy outputs become essays, scripts, and field notes. It should not be a prompt-only page.

Draft types:

- essay
- script
- field_note

Draft statuses:

- seed
- drafting
- revised
- final

Core features:

- Create, edit, save, reopen, and delete drafts.
- Filter by draft type and status.
- Edit title, body, type, status, and links.
- Link drafts to concepts, sources, questions, and beliefs.
- Context panel shows related evidence without stealing focus from the editor.

Draft object:

- `id`
- `type`
- `title`
- `body`
- `status`
- `conceptTags`
- `sourceIds`
- `questionIds`
- `beliefIds`
- `dateCreated`
- `dateUpdated`

Firestore:

- `/users/{uid}/drafts/{draftId}`

## Evolution

Purpose: belief/history timeline.

Evolution shows how concepts, beliefs, questions, and drafts changed over time.

Core features:

- Timeline cards ordered by date.
- Events can link back to beliefs, concepts, questions, drafts, sources, or insights.
- Events can include influencing entity IDs.
- Major object operations should create events where useful: idea formed, belief revised, draft created, question answered, source completed, concept created.

Firestore:

- `/users/{uid}/timeline/{eventId}`

## Goals

Purpose: focused, editable progress by source type.

The sidebar should not show one ambiguous `0/12` count. Goals are per media type.

Goal examples:

- Books: 8 / 12
- Movies: 2 / 10
- Podcasts: 5 / 20
- Papers: 3 / 15

Goal settings:

- Target year
- Enabled media types
- Target count per media type

Firestore:

- `/users/{uid}/settings/goal`

## Firestore Structure

All user data stays under `/users/{uid}`. Prototype mode can use the fallback user id `anonymous-scholar`.

Collections:

- `/users/{uid}/media`
- `/users/{uid}/concepts`
- `/users/{uid}/insights`
- `/users/{uid}/vault`
- `/users/{uid}/questions`
- `/users/{uid}/drafts`
- `/users/{uid}/timeline`

Settings documents:

- `/users/{uid}/settings/goal`
- `/users/{uid}/settings/atlasView`
- `/users/{uid}/settings/atlasNodes`

## Relationships

Readex mostly uses linked IDs and concept tags.

Media can link to:

- Concept tags
- Annotations
- Session notes
- Ideas/beliefs

Concepts can link to:

- Sources through source tags
- Annotations through annotation tags
- Questions through question concept IDs
- Beliefs through belief tags
- Drafts through draft tags
- Evolution events through entity IDs and influenced-by IDs

Beliefs can link to:

- Sources through `sourceIds`
- Concepts through `tags`
- Drafts through draft `beliefIds`
- Questions through question/belief relationships
- Timeline events by entity ID

Drafts can link to:

- Concepts through `conceptTags`
- Sources through `sourceIds`
- Questions through `questionIds`
- Beliefs through `beliefIds`

Questions can link to:

- Concepts through `conceptIds`
- Sources through `sourceIds`
- Evidence through `evidenceIds`
- Drafts through draft `questionIds`

Timeline events can link to:

- Any entity through `entityType` and `entityId`
- Supporting context through `influencedBy`

## Stored vs Derived Data

Stored:

- Media/source records
- Concept records
- Beliefs/vault entries
- Manual questions
- Drafts
- Timeline events
- Settings
- Atlas branch links and positions when implemented

Derived:

- Concept counts
- Shared-evidence map edges
- Questions derived from source capture fields
- Questions derived from question annotations
- Concept lists inferred from tags
- Goal progress counts from media records

Derived data should be recalculated in the UI unless it becomes expensive enough to denormalize.

## Firebase Write Helpers

The app should centralize common writes where practical:

- `createMedia`
- `updateMedia`
- `deleteMedia`
- `createConcept`
- `updateConcept`
- `deleteConcept`
- `createBelief`
- `updateBelief`
- `deleteBelief`
- `createDraft`
- `updateDraft`
- `deleteDraft`
- `createQuestion`
- `updateQuestionAnswer`
- `createTimelineEvent`
- `saveGoalSettings`
- `saveAtlasView`
- `saveAtlasNodePositions`

Linked operations should use batched writes. The most important batch is idea creation:

1. Create belief entry.
2. Create mirrored insight record if needed.
3. Ensure selected concepts exist.
4. Create timeline event.

## Expected User Flows

Add a source:

1. User opens Library.
2. User clicks add source.
3. User enters media type, title, creator, status, and concept tags.
4. If no concept is selected, `Unsorted Ideas` is applied.
5. Source appears in Library and contributes to per-media goal progress.

Annotate a source:

1. User opens a Library source detail page.
2. User adds a highlight, thought, question, or connection.
3. User tags the annotation with concepts.
4. Tagged concepts appear in concept popups and Atlas relationships.

Create an idea:

1. User opens Beliefs.
2. User clicks `+ Idea`.
3. User writes the statement, confidence, evidence, and concept tags.
4. Firestore creates a belief entry.
5. Firestore optionally creates a mirrored insight.
6. Firestore creates a timeline event.

Answer a question:

1. User opens Questions.
2. User selects a question.
3. User writes a working answer.
4. User reviews related concepts, sources, beliefs, and drafts.
5. User saves the answer.

Write a draft:

1. User opens Writing.
2. User creates an essay, script, or field note.
3. User links concepts, sources, questions, and beliefs.
4. User writes in the editor.
5. User saves and reopens later.

Explore Atlas:

1. User opens Atlas.
2. User selects a concept node.
3. Selected-node panel shows linked inputs and outputs.
4. User branches the concept to another concept using a blank-start dropdown.
5. Node click stays in Atlas.

## Migration Notes From Local Prototype

The local prototype used localStorage keys such as media, concepts, questions, beliefs, drafts, and timeline records. In Firebase Studio, each object becomes a Firestore document under `/users/{uid}`.

Migration rules:

- Sources become `media` documents.
- Ideas become `vault` documents.
- Existing insight records can be mirrored to `insights`.
- Concept tags should be normalized and deduplicated.
- Missing concept tags should become `Unsorted Ideas`.
- Writing drafts move to `/drafts`.
- Timeline/evolution entries move to `/timeline`.
- Goal settings move to `/settings/goal`.

## Verification Checklist

- Sidebar renders Atlas, Concepts, Questions, Library, Beliefs, Writing, Evolution.
- Atlas renders as its own page and does not mirror the last tab.
- Atlas node clicks stay in Atlas.
- Branch dropdown starts blank.
- Concepts page exists and cards open concept detail dialogs.
- Concept popup shows linked inputs and outputs.
- Library source detail supports capture, annotations, concept tags, edit, and delete.
- Beliefs page is the home for created ideas.
- Creating an idea creates a belief entry.
- Questions page opens an answer workspace and saves answers.
- Writing page supports draft create, edit, save, reopen, delete, and filters.
- Goals render separately by media type.
- Firestore paths stay under `/users/{uid}`.
- `npm run typecheck` passes.
- `npm run build` passes.
