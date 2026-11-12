VENV   := .venv
PY     := $(VENV)/bin/python
PORT   ?= 8000
DEPS   := $(VENV)/.installed

.PHONY: help install solve test report serve demo all clean

help:  ## List targets
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-8s %s\n", $$1, $$2}'

$(DEPS): requirements.txt
	python3 -m venv $(VENV)
	$(PY) -m pip install -q -r requirements.txt
	@touch $@

install: $(DEPS)  ## Create .venv and install pinned requirements

solve: $(DEPS)  ## Run QAOA + baselines, write web/data/results.json and results/*.png (2-3 min)
	PYTHONPATH=src $(PY) -m bijli.run

test: $(DEPS)  ## Run the pytest suite
	PYTHONPATH=src $(PY) -m pytest -q

report: $(DEPS)  ## Build report/WhoGetsThePower_Report.docx
	$(PY) report/build_report.py

serve:  ## Serve the web page at http://localhost:8000 (PORT=... to change)
	python3 -m http.server -d web $(PORT)

demo:  ## Serve the two-screen planner at http://localhost:8000/demo/ (PORT=... to change)
	@echo "Open http://localhost:$(PORT)/demo/"
	python3 -m http.server -d web $(PORT)

all: test solve report  ## Test, solve, then build the report

clean:  ## Remove caches (keeps .venv and committed results)
	rm -rf .pytest_cache src/bijli/__pycache__ tests/__pycache__
