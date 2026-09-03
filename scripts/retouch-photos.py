"""Maakt assets/photos/provisional/ uit photo-masters/.

Basis is het onbewerkte origineel op volle resolutie. Alleen binnen de contouren van
weggehaalde rommel worden de pixels van de eerste retouche gebruikt (photo-masters/
first-retouch/, een generatieve AI-bewerking op lagere resolutie): uitgelijnd met een
SIFT-homografie, licht verscherpt en met zachte rand ingeblend. Welke contouren dat zijn
wordt per foto bepaald uit het verschil tussen origineel en eerste retouche, en daarna
met de hand geselecteerd in CFG - de eerste retouche heeft ook luchten opnieuw
gegenereerd en meubels verzonnen, en dat wordt niet overgenomen. Waar de rommel niet
zonder verzinsels weg kan, wordt bijgesneden.

Klassieke inpainting (OpenCV FSR, SHIFTMAP) is geprobeerd en faalt zichtbaar op deze
foto's; vandaar deze hybride.

    pip install opencv-contrib-python-headless numpy
    python3 scripts/retouch-photos.py            # alle foto's
    python3 scripts/retouch-photos.py shower.jpg # een enkele
"""
import os, sys
import cv2, numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORIG = os.path.join(ROOT, "photo-masters")
FIRST = os.path.join(ORIG, "first-retouch")
OUT = os.path.join(ROOT, "assets", "photos", "provisional")

# comp_at: ankerpunten (x, y); het verschil-component met het dichtstbijzijnde zwaartepunt is rommel en mag weg
# rect/circ: extra gebieden in origineel-coordinaten
# crop: (x0, y0, x1, y1) op het eindresultaat
# tone: gemiddelde kleur van het ingeblende vlak gelijktrekken met de rand eromheen
CFG = {
    "exterior-main.jpg": dict(comp_at=[(905, 878), (575, 770), (667, 838), (438, 1009), (408, 568), (368, 889), (620, 512)], rect=[(835, 715, 975, 790)], circ=[(704, 960, 24), (983, 972, 16)]),
    "garden-terrace.jpg": dict(comp_at=[(473, 837), (1103, 1077), (552, 1012), (945, 647)], rect=[(1150, 960, 1240, 1040), (715, 875, 805, 915)], crop=(0, 0, 1536, 1085)),
    "living-overview.jpg": dict(comp_at=[(1158, 864), (658, 839)]),
    "living-kitchen-wide.jpg": dict(crop=(560, 0, 1536, 800)),
    "walkin-closet.jpg": dict(rect=[(0, 890, 120, 1010)], crop=(0, 0, 1152, 1010)),
    "kitchen-overview.jpg": dict(crop=(470, 0, 1152, 1065)),
    "double-bedroom.jpg": dict(comp_at=[(514, 1055), (862, 738), (997, 748)], rect=[(808, 670, 916, 806)], tone=True),
    "twin-bedroom.jpg": dict(comp_at=[(382, 1319), (83, 1332), (900, 1039), (803, 1250), (199, 576), (393, 602), (576, 615), (108, 997), (96, 923), (635, 648)]),
    "bathroom-wide.jpg": dict(comp_at=[(1000, 545), (970, 1089)]),
    "separate-toilet.jpg": dict(comp_at=[(933, 659), (481, 1084), (538, 642), (889, 246)]),
    "shower.jpg": dict(comp_at=[(901, 498), (849, 528), (888, 694)], rect=[(800, 405, 955, 585)]),
    "veranda-panorama.jpg": dict(comp_at=[(269, 268), (730, 212)]),
}

sift = cv2.SIFT_create(nfeatures=6000)
matcher = cv2.BFMatcher()


def align(first, orig):
    """Homografie die de eerste retouche op het origineel legt."""
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(first, cv2.COLOR_BGR2GRAY), None)
    k2, d2 = sift.detectAndCompute(cv2.cvtColor(orig, cv2.COLOR_BGR2GRAY), None)
    good = [a for a, b in matcher.knnMatch(d1, d2, k=2) if a.distance < 0.72 * b.distance]
    H, _ = cv2.findHomography(
        np.float32([k1[g.queryIdx].pt for g in good]),
        np.float32([k2[g.trainIdx].pt for g in good]), cv2.RANSAC, 4.0)
    h, w = orig.shape[:2]
    warped = cv2.warpPerspective(first, H, (w, h), flags=cv2.INTER_LANCZOS4)
    corners = cv2.perspectiveTransform(
        np.float32([[[0, 0]], [[first.shape[1], 0]], [[first.shape[1], first.shape[0]]], [[0, first.shape[0]]]]), H)
    coverage = np.zeros((h, w), np.uint8)
    cv2.fillConvexPoly(coverage, corners.reshape(-1, 2).astype(np.int32), 255)
    return warped, coverage


def removed_components(orig, warped, coverage):
    """Wat de eerste retouche heeft veranderd, als losse componenten."""
    lo = cv2.cvtColor(cv2.GaussianBlur(orig, (7, 7), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
    lw = cv2.cvtColor(cv2.GaussianBlur(warped, (7, 7), 0), cv2.COLOR_BGR2LAB).astype(np.float32)
    d = np.sqrt(((lo - lw) ** 2).sum(2))
    d[coverage == 0] = 0
    mask = (d > 22).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((25, 25), np.uint8))
    n, labels, stats, _ = cv2.connectedComponentsWithStats(mask)
    comps = [(stats[i][4], i) for i in range(1, n) if stats[i][4] >= 900]
    return [labels == i for _, i in comps]


def unsharp(im, amount=0.7, sigma=1.4):
    return cv2.addWeighted(im, 1 + amount, cv2.GaussianBlur(im, (0, 0), sigma), -amount, 0)


def retouch(name):
    c = CFG[name]
    orig = cv2.imread(os.path.join(ORIG, name))
    h, w = orig.shape[:2]
    mask = np.zeros((h, w), np.uint8)
    result = orig.copy()

    if c.get("comp_at") or c.get("rect") or c.get("circ"):
        first = cv2.imread(os.path.join(FIRST, name))
        warped, coverage = align(first, orig)
        comps = removed_components(orig, warped, coverage)
        centroids = [np.argwhere(m).mean(0)[::-1] for m in comps]  # (x, y)
        for px, py in c.get("comp_at", []):
            i = int(np.argmin([np.hypot(cx - px, cy - py) for cx, cy in centroids]))
            mask[comps[i]] = 255
        for x0, y0, x1, y1 in c.get("rect", []):
            cv2.rectangle(mask, (x0, y0), (x1, y1), 255, -1)
        for cx, cy, r in c.get("circ", []):
            cv2.circle(mask, (cx, cy), r, 255, -1)
        mask = cv2.dilate(mask, np.ones((13, 13), np.uint8))

        patch = unsharp(warped)
        if c.get("tone"):
            pl = cv2.cvtColor(patch, cv2.COLOR_BGR2LAB).astype(np.float32)
            ol = cv2.cvtColor(orig, cv2.COLOR_BGR2LAB).astype(np.float32)
            n, labels, _, _ = cv2.connectedComponentsWithStats(mask)
            for i in range(1, n):
                blob = labels == i
                ring = cv2.dilate(blob.astype(np.uint8), np.ones((25, 25), np.uint8)).astype(bool) & ~blob
                if ring.sum() >= 50:
                    pl[blob] += ol[ring].mean(0) - pl[blob].mean(0)
            patch = cv2.cvtColor(np.clip(pl, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)

        alpha = np.clip(cv2.GaussianBlur(mask.astype(np.float32) / 255.0, (0, 0), 4) * 1.15, 0, 1)[..., None]
        result = (patch * alpha + orig * (1 - alpha)).round().astype(np.uint8)

    if "crop" in c:
        x0, y0, x1, y1 = c["crop"]
        result = result[y0:y1, x0:x1]
        mask = mask[y0:y1, x0:x1]

    cv2.imwrite(os.path.join(OUT, name), result, [cv2.IMWRITE_JPEG_QUALITY, 92])
    return f"{name:26s} {result.shape[1]}x{result.shape[0]}  bewerkt {int((mask > 0).sum()):6d}px"


if __name__ == "__main__":
    for name in (sys.argv[1:] or CFG):
        print(retouch(name), flush=True)
