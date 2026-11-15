# Source catalogue: tested so far

This is a progress record for A5-02, not a claim that the full catalogue is tested.

| Source | Result on 15 November 2026 | Evidence handling |
|---|---|---|
| Wikimedia Commons API | Live imageinfo requests succeeded with the project User-Agent after enabling network access | Refreshed licence, author and thumbnail metadata for both retained images; inspected local copies visually |
| Commons direct thumbnails | Both dossier URLs passed the online image content-type check | 1920-pixel requested thumbnails; no Google imagery |
| Survey of London, volume 38, pp220–227 | Browser-fetch service returned 403; complete inherited text was available locally; later online validator passed | Read the chapter, locate claims individually, paraphrase; no plates copied |
| Survey of London, volume 38, pp233–247 | Read inherited complete text; later online validator passed | Confirms the south-side Royal College of Science building postdates 1893 |
| Imperial College Queen's Tower history | Browser-fetch service returned 403; read inherited full text; later online validator passed | Prefer Survey's detailed chronology where a broad overview compresses building stages |
| Project Gutenberg, Punch, 22 July 1893 | Opened live; located the North Gallery wedding-presents sketch | Contemporary satire, explicitly qualified; not a literal transcript or crowd measurement |
| OpenStreetMap | Rechecked cached geometry for the Queen's Tower photo spot | 4.4 m from pedestrian way/1213090896, outside buildings, sight line intersects only subject way/788526940; on-site access still requires a human check |

Wikidata, Historic England, Internet Archive/HathiTrust, NLS and optional keyed
providers have not been newly tested in this session. Earlier leads are in the handover.

## Image corrections

- The Rijksmuseum record's Artist field credits Rijksmuseum, while its object
  description identifies Frith & Co. as photographer. Both are preserved.
- The postcard's November 1903 date is a mailing date, not a verified exposure date.
  Its depicted interval is explicitly inferred and is not used to assert 1893 incidentals.
- A c.1960 Geograph image is only 427×640: reject it as model input, even though the
  Commons API reports larger requested thumbnail dimensions alongside its unscaled URL.
- The undated Kensington snapshot's 2017 field is not its historical exposure date.
  Its association with a 1961 guide reprinted in 1969 cannot date the photograph precisely.
