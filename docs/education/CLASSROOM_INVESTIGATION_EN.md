# Can a Climate Average Hide a Different Story?

*A 15-minute Earth-science investigation with NASA data, for upper secondary and first-year university students.*
*SI disclosure: written with an SI coding tool (Claude) for the ProGarLabs team; every value comes from the live app and its published results. This activity has not yet been tried with a class.*

**What you need:** a computer with a recent browser (Chrome, Edge, Firefox, Safari) and this worksheet. No account, no installation.
**The app:** https://giuseppeprbst.github.io/trend-detective-lab/ — *Trend Detective Lab*, built for the NASA Space Apps Challenge 2026.

**Three words you will need**

- **Trend** — the average change per decade of a quantity, estimated by fitting a straight line to yearly values.
- **95 % confidence interval (CI)** — the range of trends compatible with the data. If it includes 0, the data cannot tell the trend apart from no trend.
- **p-value** — how surprising the data would be if there were no trend at all. Small (below 0.05) = a "statistically significant" trend. It says nothing about the cause, or about how important the change is.

---

## Exercise 1 — Two regions of Chile (5 minutes)

Open **https://giuseppeprbst.github.io/trend-detective-lab/?view=lab** (the Research Lab).
In section **1 · Start with a case**, click **"Is southern Chile warming as fast as the desert north?"**. Scroll down to sections **5 · Test the trend** and **6 · Compare regions**.

The data: **air temperature at 2 m from NASA MERRA-2** (a *reanalysis*: a weather model constrained by observations), **1980–2025**.

1. What is the estimated trend in **Los Lagos**? In **Antofagasta**? Write the value, the unit and the 95 % CI.
2. Which of the two trends is statistically significant?
3. Does the page test the **difference** between the two trends directly? What is the difference, its CI and its p-value?
4. Write one sentence that the evidence **supports**.
5. Write one sentence that the evidence does **not** support.

> Tip: on the globe (https://giuseppeprbst.github.io/trend-detective-lab/?layer=t2m, then **Trends**) you can see the same regional trends for all 16 regions.

## Exercise 2 — Look inside one region (5 minutes)

Open **https://giuseppeprbst.github.io/trend-detective-lab/?region=antofagasta&period=1980-2025&scale=fixed**.
The globe flies to Antofagasta. Each coloured footprint is **one native MERRA-2 cell** (about 55 × 64 km) and its computed trend. Click **Compare** (top of the screen) to see the table *Coast minus interior*. Hover over a few cells.

1. Over **1980–2025**, do the coastal and the interior cells show the same trend? Use the *Compare* table.
2. Change the **Statistical window** (bottom of the screen) to **2003–2025**. What happens to the coast, the interior and their difference?
3. Now set **Colour scale** (left panel) to *Spatial contrast*, and switch between windows again. Why does the app warn that these colours are **not directly comparable** between windows?
4. Over the sea, a dashed outline shows the NASA MUR **sea-surface temperature** study area (2003–2025). Click inside it. Does this show that the ocean **caused** the coastal contrast?
5. A cell is about 55 × 64 km. Why does that matter when we talk about "the coast"?

## Exercise 3 — When the data sources disagree (5 minutes)

Open **https://giuseppeprbst.github.io/trend-detective-lab/?q=disagreement** and scroll to **"When Earth observation datasets disagree: Magallanes"**.

The figure compares, for **precipitation in Magallanes**, NASA **GPM IMERG** (satellite estimates merged with rain gauges), **ERA5** (another reanalysis, at five grid points) and the **Punta Arenas** weather station — each with its 95 % interval.

1. What does IMERG conclude about precipitation in Magallanes (1998–2024)?
2. Do the station and ERA5 support the same conclusion?
3. IMERG's trend is "statistically significant". Does that make it certain?
4. How would you tell a friend what we know about rain in Magallanes, in one honest sentence?
5. Why might it be **useful** for a tool to show results that contradict each other?

---

## To finish (optional, 2 minutes)

Pick one of the six regional layers on the globe (*Data on the globe* → *Land surface*), for example **root-zone soil moisture**. Which product is it, over which years, and is it a measurement or a model output?
