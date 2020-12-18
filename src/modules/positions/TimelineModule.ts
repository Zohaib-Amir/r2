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

import { IS_DEV } from "../..";
import { Locator } from "../../model/Locator";
import Publication from "../../model/Publication";
import IFrameNavigator from "../../navigator/IFrameNavigator";
import { addEventListenerOptional } from "../../utils/EventHandler";
import ReaderModule from "../ReaderModule";
import * as HTMLUtilities from "../../utils/HTMLUtilities";
import { oc } from "ts-optchain";

export interface TimelineModuleConfig {
    publication: Publication;
    delegate: IFrameNavigator;
}

export default class TimelineModule implements ReaderModule {

    private publication: Publication;
    private delegate: IFrameNavigator;
    private timelineContainer: HTMLDivElement;
    private positionSlider: HTMLInputElement;

    public static async create(config: TimelineModuleConfig) {
        const timeline = new this(
            config.delegate,
            config.publication
        );

        await timeline.start();
        return timeline;
    }

    private constructor(delegate: IFrameNavigator, publication: Publication) {
        this.delegate = delegate
        this.publication = publication
    }

    async stop() {
        if (IS_DEV) { console.log("Timeline module stop") }
    }

    protected async start(): Promise<void> {

        this.delegate.timelineModule = this

        this.timelineContainer = HTMLUtilities.findElement(document, "#container-view-timeline") as HTMLDivElement;
        if (oc(this.delegate.rights).enableMaterial(false)) {
            this.positionSlider = HTMLUtilities.findElement(document, "#positionSlider") as HTMLInputElement;
        }
        if (!oc(this.delegate.rights).autoGeneratePositions(true)) {
            this.positionSlider.style.display = "none";
        }
    }

    async initialize() {
        return new Promise(async (resolve) => {
            await (document as any).fonts.ready;

            let locator = this.delegate.currentLocator()
            if (oc(this.delegate.rights).enableMaterial(false) && oc(this.delegate.rights).autoGeneratePositions(true)) {
                this.positionSlider.value = locator.locations.position.toString()
                this.positionSlider.max = (locator.locations.totalRemainingPositions + locator.locations.position).toString()
            }

            this.timelineContainer.innerHTML = ""
            this.publication.readingOrder.forEach(link => {

                if (IS_DEV) console.log(link.contentWeight)
                const linkHref = this.publication.getAbsoluteHref(link.href);
                const tocItemAbs = this.publication.getTOCItemAbsolute(linkHref);
                const tocHref = (tocItemAbs.href.indexOf("#") !== -1) ? tocItemAbs.href.slice(0, tocItemAbs.href.indexOf("#")) : tocItemAbs.href
                const tocHrefAbs = this.publication.getAbsoluteHref(tocHref);

                var chapterHeight
                if (this.publication.positions) {
                    if (link.contentWeight) {
                        chapterHeight = link.contentWeight
                    } else {
                        chapterHeight = 5
                    }
                } else {
                    chapterHeight = 100 / this.publication.readingOrder.length
                }

                var chapter = document.createElement("div")
                chapter.style.height = chapterHeight + "%"
                chapter.style.width = "100%"
                chapter.className = "chapter";

                if (tocItemAbs.title !== undefined) {
                    var tooltip = document.createElement("span")
                    tooltip.innerHTML = tocItemAbs.title;
                    tooltip.className = "chapter-tooltip";
                    chapter.appendChild(tooltip);
                }

                addEventListenerOptional(chapter, 'click', (event: MouseEvent) => {

                    event.preventDefault();
                    event.stopPropagation();
                    let position
                    if (oc(this.delegate.rights).autoGeneratePositions(true)) {
                        position = this.publication.positions.filter((el: Locator) => el.href === link.href)[0]
                        position.href = this.publication.getAbsoluteHref(position.href)
                    } else {
                        position = {
                            href: tocHrefAbs,
                            locations: {
                                progression: 0
                            },
                            type: link.type,
                            title: link.title
                        };
                    }
                    if (IS_DEV) console.log(position)
                    this.delegate.navigate(position)

                });

                if (tocHrefAbs === this.delegate.currentChapterLink.href) {
                    chapter.className += " active";
                } else {
                    chapter.className = chapter.className.replace(" active", "");
                }

                // append bookmarks indicator
                // append notes indicator
                // append highlights indicator

                this.timelineContainer.appendChild(chapter)

            });

            resolve()
        });
    }

}
