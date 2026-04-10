---
summary: Catalog source audit — quarantined sources ready to promote, grouped by domain and readiness
read_when: [catalog audit, source promotion, quarantined sources, domain coverage]
---

# Catalog Source Audit

Audit target: `config/sources/catalog.json`

Note: the current file contains `244` sources, not `247`. Counts below use the file contents as of 2026-04-08.

## Status Counts

| Status bucket | Count | Notes |
| --- | ---: | --- |
| active | 135 | Exact `status: active` entries |
| quarantined | 31 | Exact `status: quarantined` entries |
| deprecated | 0 | No exact `status: deprecated` entries present |
| other | 78 | Aggregated non-requested statuses: `archived`=72, `degraded`=4, `stale`=2 |

## Quarantined Readiness Summary

Classification rule used for this audit:

- `READY TO PROMOTE`: `responseFormat: json`, no `api_key`/`apikey`/`token` marker in URL metadata, and a syntactically usable URL or URL pattern
- `NEEDS API KEY`: JSON source but URL metadata includes an auth placeholder or auth query param marker
- `NEEDS ADAPTER`: non-JSON source
- `UNKNOWN`: metadata does not support a clear decision

| Group | Count | Criteria met |
| --- | ---: | --- |
| READY TO PROMOTE | 31 | JSON response, no auth placeholder, usable URL/URL pattern |
| NEEDS API KEY | 0 | JSON response but URL contains `api_key`/`apikey`/`token` marker |
| NEEDS ADAPTER | 0 | Non-JSON response format |
| UNKNOWN | 0 | Insufficient metadata to classify |

## Quarantined Sources

Domain assignment is based on `topics[]` and `domainTags[]` only, per request.

| ID | Name | Provider | Host | Format | Auth/API key | Functional URL pattern | Domain | Topics | Domain tags | Readiness |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| pypi-2099c4ae | pypi-package | pypi | pypi.org | json | No | Yes | tech/software | software, pypi, python | software, pypi, python | READY TO PROMOTE |
| generic-1533e745 | wikidata-entity | generic | www.wikidata.org | json | No | Yes | other | reference, knowledge, structured-data | reference, knowledge, structured-data | READY TO PROMOTE |
| generic-4427e9c0 | restcountries | generic | restcountries.com | json | No | Yes | other | reference, geography | reference, geography | READY TO PROMOTE |
| coingecko-dot-price | coingecko-dot-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices | crypto, prices | READY TO PROMOTE |
| coingecko-avax-price | coingecko-avax-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices | crypto, prices | READY TO PROMOTE |
| coingecko-global | coingecko-global-data | coingecko | api.coingecko.com | json | No | Yes | other | crypto, market-overview | crypto, market-overview | READY TO PROMOTE |
| coingecko-price-dot | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, polkadot | crypto, prices | READY TO PROMOTE |
| coingecko-price-avax | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, avalanche | crypto, prices | READY TO PROMOTE |
| coingecko-price-link | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, chainlink | crypto, prices | READY TO PROMOTE |
| coingecko-price-arb | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, arbitrum | crypto, prices | READY TO PROMOTE |
| coingecko-price-xrp | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, ripple | crypto, prices | READY TO PROMOTE |
| coingecko-price-sol | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, solana | crypto, prices | READY TO PROMOTE |
| coingecko-price-op | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, optimism | crypto, prices | READY TO PROMOTE |
| coingecko-price-bnb | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, binancecoin | crypto, prices | READY TO PROMOTE |
| coingecko-price-ada | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, cardano | crypto, prices | READY TO PROMOTE |
| coingecko-price-doge | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, dogecoin | crypto, prices | READY TO PROMOTE |
| coingecko-price-trx | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, tron | crypto, prices | READY TO PROMOTE |
| coingecko-price-shib | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, shiba-inu | crypto, prices | READY TO PROMOTE |
| coingecko-price-ton | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, the-open-network | crypto, prices | READY TO PROMOTE |
| coingecko-price-sui | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, sui | crypto, prices | READY TO PROMOTE |
| coingecko-price-near | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, near | crypto, prices | READY TO PROMOTE |
| coingecko-price-apt | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, aptos | crypto, prices | READY TO PROMOTE |
| coingecko-price-hbar | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, hedera-hashgraph | crypto, prices | READY TO PROMOTE |
| coingecko-price-bch | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, bitcoin-cash | crypto, prices | READY TO PROMOTE |
| coingecko-price-icp | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, internet-computer | crypto, prices | READY TO PROMOTE |
| coingecko-price-fil | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, filecoin | crypto, prices | READY TO PROMOTE |
| coingecko-price-render | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, render-token | crypto, prices | READY TO PROMOTE |
| coingecko-price-uni | coingecko-simple-price | coingecko | api.coingecko.com | json | No | Yes | crypto/prices | crypto, prices, uniswap | crypto, prices | READY TO PROMOTE |
| hn-algolia-broad-0f177d07 | hn-geopolitics-broad | hn-algolia-broad | hn.algolia.com | json | No | Yes | other | geopolitics | geopolitics | READY TO PROMOTE |
| hn-algolia-broad-013c81b3 | hn-twitter-pulse-broad | hn-algolia-broad | hn.algolia.com | json | No | Yes | other | twitter-pulse, twitter, pulse | twitter-pulse, twitter, pulse | READY TO PROMOTE |
| hn-algolia-broad-29d8c764 | hn-story-broad | hn-algolia-broad | hn.algolia.com | json | No | Yes | other | story | story | READY TO PROMOTE |

## Grouped By Readiness

### READY TO PROMOTE

| ID | Name | Host | Domain | Format | Auth/API key | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| pypi-2099c4ae | pypi-package | pypi.org | tech/software | json | No | Package metadata endpoint |
| generic-1533e745 | wikidata-entity | www.wikidata.org | other | json | No | Entity JSON export |
| generic-4427e9c0 | restcountries | restcountries.com | other | json | No | Country reference API |
| coingecko-dot-price | coingecko-dot-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-avax-price | coingecko-avax-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-global | coingecko-global-data | api.coingecko.com | other | json | No | Market overview |
| coingecko-price-dot | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-avax | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-link | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-arb | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-xrp | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-sol | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-op | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-bnb | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-ada | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-doge | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-trx | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-shib | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-ton | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-sui | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-near | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-apt | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-hbar | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-bch | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-icp | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-fil | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-render | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| coingecko-price-uni | coingecko-simple-price | api.coingecko.com | crypto/prices | json | No | Price endpoint |
| hn-algolia-broad-0f177d07 | hn-geopolitics-broad | hn.algolia.com | other | json | No | HN search endpoint tagged for a non-tech topic |
| hn-algolia-broad-013c81b3 | hn-twitter-pulse-broad | hn.algolia.com | other | json | No | HN search endpoint tagged for a non-tech topic |
| hn-algolia-broad-29d8c764 | hn-story-broad | hn.algolia.com | other | json | No | HN search endpoint tagged for a non-tech topic |

### NEEDS API KEY

No quarantined sources matched this bucket.

### NEEDS ADAPTER

No quarantined sources matched this bucket.

### UNKNOWN

No quarantined sources matched this bucket.

## READY TO PROMOTE By Domain

### crypto/prices

Already well-covered. Promotion here mainly adds more single-asset Coingecko price endpoints.

| ID | Name | Host | Topics | Notes |
| --- | --- | --- | --- | --- |
| coingecko-dot-price | coingecko-dot-price | api.coingecko.com | crypto, prices | Single-asset price endpoint |
| coingecko-avax-price | coingecko-avax-price | api.coingecko.com | crypto, prices | Single-asset price endpoint |
| coingecko-price-dot | coingecko-simple-price | api.coingecko.com | crypto, prices, polkadot | Single-asset price endpoint |
| coingecko-price-avax | coingecko-simple-price | api.coingecko.com | crypto, prices, avalanche | Single-asset price endpoint |
| coingecko-price-link | coingecko-simple-price | api.coingecko.com | crypto, prices, chainlink | Single-asset price endpoint |
| coingecko-price-arb | coingecko-simple-price | api.coingecko.com | crypto, prices, arbitrum | Single-asset price endpoint |
| coingecko-price-xrp | coingecko-simple-price | api.coingecko.com | crypto, prices, ripple | Single-asset price endpoint |
| coingecko-price-sol | coingecko-simple-price | api.coingecko.com | crypto, prices, solana | Single-asset price endpoint |
| coingecko-price-op | coingecko-simple-price | api.coingecko.com | crypto, prices, optimism | Single-asset price endpoint |
| coingecko-price-bnb | coingecko-simple-price | api.coingecko.com | crypto, prices, binancecoin | Single-asset price endpoint |
| coingecko-price-ada | coingecko-simple-price | api.coingecko.com | crypto, prices, cardano | Single-asset price endpoint |
| coingecko-price-doge | coingecko-simple-price | api.coingecko.com | crypto, prices, dogecoin | Single-asset price endpoint |
| coingecko-price-trx | coingecko-simple-price | api.coingecko.com | crypto, prices, tron | Single-asset price endpoint |
| coingecko-price-shib | coingecko-simple-price | api.coingecko.com | crypto, prices, shiba-inu | Single-asset price endpoint |
| coingecko-price-ton | coingecko-simple-price | api.coingecko.com | crypto, prices, the-open-network | Single-asset price endpoint |
| coingecko-price-sui | coingecko-simple-price | api.coingecko.com | crypto, prices, sui | Single-asset price endpoint |
| coingecko-price-near | coingecko-simple-price | api.coingecko.com | crypto, prices, near | Single-asset price endpoint |
| coingecko-price-apt | coingecko-simple-price | api.coingecko.com | crypto, prices, aptos | Single-asset price endpoint |
| coingecko-price-hbar | coingecko-simple-price | api.coingecko.com | crypto, prices, hedera-hashgraph | Single-asset price endpoint |
| coingecko-price-bch | coingecko-simple-price | api.coingecko.com | crypto, prices, bitcoin-cash | Single-asset price endpoint |
| coingecko-price-icp | coingecko-simple-price | api.coingecko.com | crypto, prices, internet-computer | Single-asset price endpoint |
| coingecko-price-fil | coingecko-simple-price | api.coingecko.com | crypto, prices, filecoin | Single-asset price endpoint |
| coingecko-price-render | coingecko-simple-price | api.coingecko.com | crypto, prices, render-token | Single-asset price endpoint |
| coingecko-price-uni | coingecko-simple-price | api.coingecko.com | crypto, prices, uniswap | Single-asset price endpoint |

### defi

No ready-to-promote quarantined sources map to `defi` from `topics[]` and `domainTags[]`.

### tech/software

| ID | Name | Host | Topics | Notes |
| --- | --- | --- | --- | --- |
| pypi-2099c4ae | pypi-package | pypi.org | software, pypi, python | Package metadata |

### science/research

No ready-to-promote quarantined sources map to `science/research` from `topics[]` and `domainTags[]`.

### economics/macro

No ready-to-promote quarantined sources map to `economics/macro` from `topics[]` and `domainTags[]`.

### other

| ID | Name | Host | Topics | Notes |
| --- | --- | --- | --- | --- |
| generic-1533e745 | wikidata-entity | www.wikidata.org | reference, knowledge, structured-data | Structured reference data |
| generic-4427e9c0 | restcountries | restcountries.com | reference, geography | Country metadata |
| coingecko-global | coingecko-global-data | api.coingecko.com | crypto, market-overview | Crypto market overview, not a spot-price feed |
| hn-algolia-broad-0f177d07 | hn-geopolitics-broad | hn.algolia.com | geopolitics | HN search endpoint, but metadata tags map to a non-tech topical query |
| hn-algolia-broad-013c81b3 | hn-twitter-pulse-broad | hn.algolia.com | twitter-pulse, twitter, pulse | HN search endpoint, but metadata tags map to a non-tech topical query |
| hn-algolia-broad-29d8c764 | hn-story-broad | hn.algolia.com | story | HN search endpoint, but metadata tags map to a non-tech topical query |
