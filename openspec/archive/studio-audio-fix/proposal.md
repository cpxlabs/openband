# Proposal: Studio Web Audio Autoplay Fix

## Context
Following the successful web audio fix in the Feed screen, the same strict autoplay policy bug exists in the Studio screen (`app/studio/[id].tsx`). When a user presses Play in the studio, the `togglePlay` function asynchronously renders tracks via `renderTracksToUrl` before attempting to call `webAudio.play()`. Because the playback command does not occur within the synchronous execution of the user's tap event, Safari and Chrome block the playback.

## Objectives
- Apply the `unlock()` paradigm to the Studio screen.
- Ensure audio seamlessly plays back on web inside the DAW editor without browser blocking.

## Scope
- Modify the `togglePlay` function in `app/studio/[id].tsx`.
