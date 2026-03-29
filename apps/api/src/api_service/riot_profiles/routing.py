from dataclasses import dataclass

from api_service.riot_profiles.errors import RiotProfileValidationError


@dataclass(frozen=True, slots=True)
class RiotRegionRouting:
    region: str
    account_region_routing: str
    platform_region: str


_REGION_MAP = {
    "BR": RiotRegionRouting(region="BR", account_region_routing="AMERICAS", platform_region="BR1"),
    "BR1": RiotRegionRouting(region="BR", account_region_routing="AMERICAS", platform_region="BR1"),
    "EUNE": RiotRegionRouting(region="EUNE", account_region_routing="EUROPE", platform_region="EUN1"),
    "EUN1": RiotRegionRouting(region="EUNE", account_region_routing="EUROPE", platform_region="EUN1"),
    "EUW": RiotRegionRouting(region="EUW", account_region_routing="EUROPE", platform_region="EUW1"),
    "EUW1": RiotRegionRouting(region="EUW", account_region_routing="EUROPE", platform_region="EUW1"),
    "JP": RiotRegionRouting(region="JP", account_region_routing="ASIA", platform_region="JP1"),
    "JP1": RiotRegionRouting(region="JP", account_region_routing="ASIA", platform_region="JP1"),
    "KR": RiotRegionRouting(region="KR", account_region_routing="ASIA", platform_region="KR"),
    "LAN": RiotRegionRouting(region="LAN", account_region_routing="AMERICAS", platform_region="LA1"),
    "LA1": RiotRegionRouting(region="LAN", account_region_routing="AMERICAS", platform_region="LA1"),
    "LAS": RiotRegionRouting(region="LAS", account_region_routing="AMERICAS", platform_region="LA2"),
    "LA2": RiotRegionRouting(region="LAS", account_region_routing="AMERICAS", platform_region="LA2"),
    "NA": RiotRegionRouting(region="NA", account_region_routing="AMERICAS", platform_region="NA1"),
    "NA1": RiotRegionRouting(region="NA", account_region_routing="AMERICAS", platform_region="NA1"),
    "OCE": RiotRegionRouting(region="OCE", account_region_routing="SEA", platform_region="OC1"),
    "OC1": RiotRegionRouting(region="OCE", account_region_routing="SEA", platform_region="OC1"),
    "TR": RiotRegionRouting(region="TR", account_region_routing="EUROPE", platform_region="TR1"),
    "TR1": RiotRegionRouting(region="TR", account_region_routing="EUROPE", platform_region="TR1"),
    "RU": RiotRegionRouting(region="RU", account_region_routing="EUROPE", platform_region="RU"),
    "PH": RiotRegionRouting(region="PH", account_region_routing="SEA", platform_region="PH2"),
    "PH2": RiotRegionRouting(region="PH", account_region_routing="SEA", platform_region="PH2"),
    "SG": RiotRegionRouting(region="SG", account_region_routing="SEA", platform_region="SG2"),
    "SG2": RiotRegionRouting(region="SG", account_region_routing="SEA", platform_region="SG2"),
    "TH": RiotRegionRouting(region="TH", account_region_routing="SEA", platform_region="TH2"),
    "TH2": RiotRegionRouting(region="TH", account_region_routing="SEA", platform_region="TH2"),
    "TW": RiotRegionRouting(region="TW", account_region_routing="SEA", platform_region="TW2"),
    "TW2": RiotRegionRouting(region="TW", account_region_routing="SEA", platform_region="TW2"),
    "VN": RiotRegionRouting(region="VN", account_region_routing="SEA", platform_region="VN2"),
    "VN2": RiotRegionRouting(region="VN", account_region_routing="SEA", platform_region="VN2")
}


def resolve_riot_region(value: str) -> RiotRegionRouting:
    candidate = value.strip().upper()
    routing = _REGION_MAP.get(candidate)
    if routing is None:
        raise RiotProfileValidationError("Unsupported Riot region.")
    return routing


def supported_riot_regions() -> list[str]:
    return sorted({routing.region for routing in _REGION_MAP.values()})
