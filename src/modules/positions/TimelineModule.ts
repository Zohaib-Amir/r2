/* eslint-disable prettier/prettier */
/*
 * Copyright 2018-2020 DITA (AM Consulting LLC)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Developed on behalf of: DITA
 * Licensed to: Bibliotheca LLC, Bokbasen AS and CAST under one or more contributor license agreements.
 */

import { Publication } from "../../model/Publication";
import { IFrameNavigator } from "../../navigator/IFrameNavigator";
import { ReaderModule } from "../ReaderModule";
import * as HTMLUtilities from "../../utils/HTMLUtilities";
import { addEventListenerOptional } from "../../utils/EventHandler";
import { Link } from "../../model/Link";
import log from "loglevel";
import { Locator } from "../../model/Locator";

export interface TimelineModuleConfig {
  publication: Publication;
  delegate: IFrameNavigator;
}

export class TimelineModule implements ReaderModule {
  private publication: Publication;
  private delegate: IFrameNavigator;
  private timelineContainer: HTMLDivElement;
  private positionSlider: HTMLInputElement;

  public static async create(config: TimelineModuleConfig) {
    const timeline = new this(config.delegate, config.publication);
    await timeline.start();
    return timeline;
  }

  private constructor(delegate: IFrameNavigator, publication: Publication) {
    this.delegate = delegate;
    this.publication = publication;
  }

  async stop() {
    log.log("Timeline module stop");
  }

  protected async start(): Promise<void> {
    this.delegate.timelineModule = this;

    this.timelineContainer = HTMLUtilities.findElement(
      document,
      "#container-view-timeline"
    );
    this.positionSlider = HTMLUtilities.findElement(
      document,
      "#positionSlider"
    );

    if (this.publication.positions) {
      if (this.positionSlider) this.positionSlider.style.display = "block";
    } else {
      if (this.positionSlider) this.positionSlider.style.display = "none";
    }
  }

  async initialize() {
    return new Promise<void>(async (resolve) => {
      await (document as any).fonts.ready;

      let locator = this.delegate.currentLocator();
      if (
        (this.delegate.rights.autoGeneratePositions &&
          this.publication.positions) ||
        this.publication.positions
      ) {
        if (this.positionSlider)
          this.positionSlider.value = (
            locator.locations.position ?? 0
          ).toString();
        if (this.positionSlider)
          this.positionSlider.max = (
            (locator.locations.totalRemainingPositions ?? 0) +
            (locator.locations.position ?? 0)
          ).toString();
      }

      if (this.timelineContainer) {
        this.timelineContainer.innerHTML = "";
      }
      this.publication.tableOfContents?.forEach((link) => {
        // link = {
        //   href: "OEBPS/2777495174666939975_84-h-0.htm.html#pg-header",
        //   title: "Frankenstein;",
        // };
        const linkHref = link.Href;
        const tocHref = linkHref;
        const tocHrefAbs = this.publication.getAbsoluteHref(tocHref ?? "");

        var chapterHeight;
        if (
          this.publication.positions &&
          this.delegate.view?.layout !== "fixed"
        ) {
          if ((link as Link).contentWeight) {
            chapterHeight = (link as Link).contentWeight;
          } else {
            chapterHeight = 1;
          }
        } else {
          chapterHeight = 100 / (this.publication.tableOfContents?.length ?? 0);
        }

        var chapter = document.createElement("div");
        chapter.style.height = chapterHeight + "%";
        chapter.style.width = "100%";
        chapter.className = "chapter";

        var tooltip = document.createElement("span");
        tooltip.innerHTML = link.Title;
        tooltip.className = "chapter-tooltip";
        chapter.appendChild(tooltip);

        addEventListenerOptional(chapter, "click", (event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          var position;

          position = {
            href: tocHrefAbs.split("#")[0],
            locations: {
              fragment: tocHrefAbs.split("#")[1],
            },
          } as Locator;
          log.log(position);

          this.delegate.navigate(position);
        });

        if (tocHrefAbs === this.delegate.currentChapterLink.href) {
          chapter.className += " active";
        } else {
          chapter.className = chapter.className.replace(" active", "");
        }

        // append bookmarks indicator
        // append notes indicator
        // append highlights indicator

        if (this.timelineContainer) {
          this.timelineContainer.appendChild(chapter);
        }
      });

      resolve();
    });
  }
}
