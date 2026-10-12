/** Saved outputs of actual local distributed CLI fixtures, not live browser shell execution. */
export const receipts = {
  "draft": {
    "artifactVersion": "0.53.0-preview.1",
    "sourceName": "Surface / first draft",
    "code": 1,
    "report": {
      "schemaVersion": 1,
      "rules": [
        "syntax",
        "property-typo",
        "explicit-transition"
      ],
      "limits": {
        "files": 32,
        "fileBytes": 256000,
        "sourceCharacters": 64000,
        "aggregateBytes": 2048000,
        "aggregateCharacters": 1024000,
        "stdinBytes": 256000,
        "diagnosticsPerFile": 30,
        "diagnosticsTotal": 120,
        "outputBytes": 131072,
        "pathCharacters": 2048
      },
      "files": [
        {
          "file": "draft.css",
          "status": "findings",
          "diagnostics": [
            {
              "from": 13,
              "to": 26,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 2,
              "column": 3
            },
            {
              "from": 36,
              "to": 51,
              "severity": "warning",
              "message": "Name the animated properties to avoid accidental layout animation.",
              "rule": "explicit-transition",
              "line": 3,
              "column": 3
            }
          ],
          "diagnosticLimitReached": false
        }
      ],
      "summary": {
        "checked": 1,
        "findingsFiles": 1,
        "skipped": 0,
        "errors": 0,
        "diagnosticsDisplayed": 2
      }
    }
  },
  "radius": {
    "artifactVersion": "0.53.0-preview.1",
    "sourceName": "Radius / corrected",
    "code": 1,
    "report": {
      "schemaVersion": 1,
      "rules": [
        "syntax",
        "property-typo",
        "explicit-transition"
      ],
      "limits": {
        "files": 32,
        "fileBytes": 256000,
        "sourceCharacters": 64000,
        "aggregateBytes": 2048000,
        "aggregateCharacters": 1024000,
        "stdinBytes": 256000,
        "diagnosticsPerFile": 30,
        "diagnosticsTotal": 120,
        "outputBytes": 131072,
        "pathCharacters": 2048
      },
      "files": [
        {
          "file": "radius.css",
          "status": "findings",
          "diagnostics": [
            {
              "from": 36,
              "to": 51,
              "severity": "warning",
              "message": "Name the animated properties to avoid accidental layout animation.",
              "rule": "explicit-transition",
              "line": 3,
              "column": 3
            }
          ],
          "diagnosticLimitReached": false
        }
      ],
      "summary": {
        "checked": 1,
        "findingsFiles": 1,
        "skipped": 0,
        "errors": 0,
        "diagnosticsDisplayed": 1
      }
    }
  },
  "clean": {
    "artifactVersion": "0.53.0-preview.1",
    "sourceName": "Properties / intentional",
    "code": 0,
    "report": {
      "schemaVersion": 1,
      "rules": [
        "syntax",
        "property-typo",
        "explicit-transition"
      ],
      "limits": {
        "files": 32,
        "fileBytes": 256000,
        "sourceCharacters": 64000,
        "aggregateBytes": 2048000,
        "aggregateCharacters": 1024000,
        "stdinBytes": 256000,
        "diagnosticsPerFile": 30,
        "diagnosticsTotal": 120,
        "outputBytes": 131072,
        "pathCharacters": 2048
      },
      "files": [
        {
          "file": "clean.css",
          "status": "checked",
          "diagnostics": [],
          "diagnosticLimitReached": false
        }
      ],
      "summary": {
        "checked": 1,
        "findingsFiles": 0,
        "skipped": 0,
        "errors": 0,
        "diagnosticsDisplayed": 0
      }
    }
  },
  "quoted": {
    "artifactVersion": "0.53.0-preview.1",
    "sourceName": "Content / kept literal",
    "code": 0,
    "report": {
      "schemaVersion": 1,
      "rules": [
        "syntax",
        "property-typo",
        "explicit-transition"
      ],
      "limits": {
        "files": 32,
        "fileBytes": 256000,
        "sourceCharacters": 64000,
        "aggregateBytes": 2048000,
        "aggregateCharacters": 1024000,
        "stdinBytes": 256000,
        "diagnosticsPerFile": 30,
        "diagnosticsTotal": 120,
        "outputBytes": 131072,
        "pathCharacters": 2048
      },
      "files": [
        {
          "file": "quoted.css",
          "status": "checked",
          "diagnostics": [],
          "diagnosticLimitReached": false
        }
      ],
      "summary": {
        "checked": 1,
        "findingsFiles": 0,
        "skipped": 0,
        "errors": 0,
        "diagnosticsDisplayed": 0
      }
    }
  },
  "syntax": {
    "artifactVersion": "0.53.0-preview.1",
    "sourceName": "Syntax / unfinished",
    "code": 1,
    "report": {
      "schemaVersion": 1,
      "rules": [
        "syntax",
        "property-typo",
        "explicit-transition"
      ],
      "limits": {
        "files": 32,
        "fileBytes": 256000,
        "sourceCharacters": 64000,
        "aggregateBytes": 2048000,
        "aggregateCharacters": 1024000,
        "stdinBytes": 256000,
        "diagnosticsPerFile": 30,
        "diagnosticsTotal": 120,
        "outputBytes": 131072,
        "pathCharacters": 2048
      },
      "files": [
        {
          "file": "syntax.css",
          "status": "findings",
          "diagnostics": [
            {
              "from": 49,
              "to": 49,
              "severity": "error",
              "message": "CSS syntax needs attention.",
              "rule": "syntax",
              "line": 4,
              "column": 1
            }
          ],
          "diagnosticLimitReached": false
        }
      ],
      "summary": {
        "checked": 1,
        "findingsFiles": 1,
        "skipped": 0,
        "errors": 0,
        "diagnosticsDisplayed": 1
      }
    }
  },
  "bounded": {
    "artifactVersion": "0.53.0-preview.1",
    "sourceName": "Bounds / 30 findings",
    "code": 1,
    "report": {
      "schemaVersion": 1,
      "rules": [
        "syntax",
        "property-typo",
        "explicit-transition"
      ],
      "limits": {
        "files": 32,
        "fileBytes": 256000,
        "sourceCharacters": 64000,
        "aggregateBytes": 2048000,
        "aggregateCharacters": 1024000,
        "stdinBytes": 256000,
        "diagnosticsPerFile": 30,
        "diagnosticsTotal": 120,
        "outputBytes": 131072,
        "pathCharacters": 2048
      },
      "files": [
        {
          "file": "bounded.css",
          "status": "findings",
          "diagnostics": [
            {
              "from": 13,
              "to": 26,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 1,
              "column": 14
            },
            {
              "from": 49,
              "to": 62,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 2,
              "column": 14
            },
            {
              "from": 85,
              "to": 98,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 3,
              "column": 14
            },
            {
              "from": 121,
              "to": 134,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 4,
              "column": 14
            },
            {
              "from": 157,
              "to": 170,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 5,
              "column": 14
            },
            {
              "from": 193,
              "to": 206,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 6,
              "column": 14
            },
            {
              "from": 229,
              "to": 242,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 7,
              "column": 14
            },
            {
              "from": 265,
              "to": 278,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 8,
              "column": 14
            },
            {
              "from": 301,
              "to": 314,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 9,
              "column": 14
            },
            {
              "from": 337,
              "to": 350,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 10,
              "column": 14
            },
            {
              "from": 374,
              "to": 387,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 11,
              "column": 15
            },
            {
              "from": 411,
              "to": 424,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 12,
              "column": 15
            },
            {
              "from": 448,
              "to": 461,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 13,
              "column": 15
            },
            {
              "from": 485,
              "to": 498,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 14,
              "column": 15
            },
            {
              "from": 522,
              "to": 535,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 15,
              "column": 15
            },
            {
              "from": 559,
              "to": 572,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 16,
              "column": 15
            },
            {
              "from": 596,
              "to": 609,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 17,
              "column": 15
            },
            {
              "from": 633,
              "to": 646,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 18,
              "column": 15
            },
            {
              "from": 670,
              "to": 683,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 19,
              "column": 15
            },
            {
              "from": 707,
              "to": 720,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 20,
              "column": 15
            },
            {
              "from": 744,
              "to": 757,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 21,
              "column": 15
            },
            {
              "from": 781,
              "to": 794,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 22,
              "column": 15
            },
            {
              "from": 818,
              "to": 831,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 23,
              "column": 15
            },
            {
              "from": 855,
              "to": 868,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 24,
              "column": 15
            },
            {
              "from": 892,
              "to": 905,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 25,
              "column": 15
            },
            {
              "from": 929,
              "to": 942,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 26,
              "column": 15
            },
            {
              "from": 966,
              "to": 979,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 27,
              "column": 15
            },
            {
              "from": 1003,
              "to": 1016,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 28,
              "column": 15
            },
            {
              "from": 1040,
              "to": 1053,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 29,
              "column": 15
            },
            {
              "from": 1077,
              "to": 1090,
              "severity": "error",
              "message": "Unknown property. Use border-radius.",
              "rule": "property-typo",
              "line": 30,
              "column": 15
            }
          ],
          "diagnosticLimitReached": true
        }
      ],
      "summary": {
        "checked": 1,
        "findingsFiles": 1,
        "skipped": 0,
        "errors": 0,
        "diagnosticsDisplayed": 30
      }
    }
  }
} as const;
