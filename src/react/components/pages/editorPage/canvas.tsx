import React from "react";
import * as shortid from "shortid";
import {
    IAssetMetadata, IRegion, RegionType, AppError, ErrorCode,
    AssetState, EditorMode, IProject, AssetType,
} from "../../../../models/applicationState";
import { CanvasTools } from "vott-ct";
import {
    Player, ControlBar, CurrentTimeDisplay, TimeDivider,
    BigPlayButton, PlaybackRateMenuButton, VolumeMenuButton,
} from "video-react";
import { Editor } from "vott-ct/lib/js/CanvasTools/CanvasTools.Editor";
import { RegionData, RegionDataType } from "vott-ct/lib/js/CanvasTools/Core/RegionData";
import { TagsDescriptor } from "vott-ct/lib/js/CanvasTools/Core/TagsDescriptor";
import { Point2D } from "vott-ct/lib/js/CanvasTools/Core/Point2D";
import { Tag } from "vott-ct/lib/js/CanvasTools/Core/Tag";
import { strings } from "../../../../common/strings";
import { ErrorHandler, IErrorHandlerProps } from "../../../../react/components/common/errorHandler/errorHandler";

export interface ICanvasProps {
    selectedAsset: IAssetMetadata;
    onAssetMetadataChanged: (assetMetadata: IAssetMetadata) => void;
    editorMode: EditorMode;
    project: IProject;
}

interface ICanvasState {
    loaded: boolean;
    selectedRegions?: IRegion[];
    canvasEnabled: boolean;
}

export default class Canvas extends React.Component<ICanvasProps, ICanvasState> {

    // Editor Methods
    /**
     * @name scaleRegionToFrameSize
     * @description rescales region based on visible frame size (used to load regions onto canvas)
     * @param {RegionData} regionData
     * @param {number} sourceWidth?
     * @param {number} sourceHeight?
     * @returns {RegionData}
     */
    public scaleRegionToFrameSize: (regionData: RegionData, sourceWidth?: number, sourceHeight?: number) => RegionData;

    /**
     * @name scaleRegionToSourceSize
     * @description rescales region based on source size (used to save regions from canvas)
     * @param {RegionData} regionData
     * @param {number} sourceWidth?
     * @param {number} sourceHeight?
     * @returns {RegionData}
     */
    public scaleRegionToSourceSize: (regionData: RegionData, sourceWidth?: number, sourceHeight?: number) => RegionData;

    // Region Manager Methods
    /**
     * @name addRegion
     * @description wrapper that adds a region to the canvas
     * @param {string} id
     * @param {RegionData} regionData
     * @param {TagsDescriptor} tagsDescriptor
     * @returns {void}
     */
    public addRegion: (id: string, regionData: RegionData, tagsDescriptor: TagsDescriptor) => void;

    /**
     * @name addPointRegion
     * @description adds point region to the canvas
     * @param {string} id
     * @param {RegionData} regionData
     * @param {TagsDescriptor} tagsDescriptor
     * @returns {void}
     */
    public addPointRegion: (id: string, regionData: RegionData, tagsDescriptor: TagsDescriptor) => void;

    /**
     * @name addPolylineRegion
     * @description adds polygon region to the canvas
     * @param {string} id
     * @param {RegionData} regionData
     * @param {TagsDescriptor} tagsDescriptor
     * @returns {void}
     */
    public addPolylineRegion: (id: string, regionData: RegionData, tagsDescriptor: TagsDescriptor) => void;

    /**
     * @name addRectRegion
     * @description adds rectagular region to the canvas
     * @param {string} id
     * @param {RegionData} regionData
     * @param {TagsDescriptor} tagsDescriptor
     * @returns {void}
     */
    public addRectRegion: (id: string, regionData: RegionData, tagsDescriptor: TagsDescriptor) => void;

    /**
     * @name deleteAllRegions
     * @description deletes all regions from the canvas
     * @returns {void}
     */
    public deleteAllRegions: () => void;

    /**
     * @name deleteRegionById
     * @description deletes region with given id from the canvas
     * @param {string} id
     * @returns {void}
     */
    public deleteRegionById: (id: string) => void;

    /**
     * @name freeze
     * @description freezes all regions the canvas to prevent accidental edits (used for hotkey control)
     * @param {string} nuance
     * @returns {void}
     */
    public freeze: (nuance: string) => void;

    /**
     * @name getSelectedRegionsBounds
     * @description get the boinding box info for the current region
     * @returns {Object}
     */
    public getSelectedRegionsBounds: () => { id: string, x: number, y: number, width: number, height: number };

    /**
     * @name redrawAllRegions
     * @description clears all regions from the canvas and redraws them
     * @returns {void}
     */
    public redrawAllRegions: () => void;

    /**
     * @name resize
     * @description resize editor canvas
     * @param {number} width
     * @param {number} height
     * @returns {void}
     */
    public resize: (width: number, height: number) => void;

    /**
     * @name selectRegionById
     * @description selects region with given id on the canvas
     * @param {string} id
     * @returns {void}
     */
    public selectRegionById: (id: string) => void;

    /**
     * @name toggleFreezeMode
     * @description toggles between freezing/unfreezing all regions on the canvas
     * @returns {void}
     */
    public toggleFreezeMode: () => void;

    /**
     * @name unfreeze
     * @description unfreezes all regions on the canvas
     * @returns {void}
     */
    public unfreeze: () => void;

    /**
     * @name updateTagsById
     * @description uppdates region with given id with provided tags descriptor
     * @param {string} id
     * @param {TagsDescriptor} tagsDescriptor
     * @returns {void}
     */
    public updateTagsById: (id: string, tagsDescriptor: TagsDescriptor) => void;

    /**
     * @name updateTagsForSelectedRegions
     * @description uppdates tags for currently selected region with provided tags descriptor
     * @param {TagsDescriptor} tagsDescriptor
     * @returns {void}
     */
    public updateTagsForSelectedRegions: (tagsDescriptor: TagsDescriptor) => void;

    /**
     * @name setSelectionMode
     * @description sets the editor's selection mode (poly/rect/copyrect/point/none)
     * @param {SelectionMode} selectionMode
     * @returns {void}
     */
    public setSelectionMode: (selectionMode: any) => void;

    public editor: Editor;

    private videoPlayer: React.RefObject<Player>;

    constructor(props, context) {
        super(props, context);

        this.state = {
            loaded: false,
            selectedRegions: [],
            canvasEnabled: true,
        };

        this.videoPlayer = React.createRef<Player>();
    }

    public async componentDidMount() {
        const ct = CanvasTools;
        const sz = document.getElementById("editor-zone") as HTMLDivElement;

        // @ts-ignore
        this.editor = new ct.Editor(sz);

        // Expose CanvasTools Editor API
        this.scaleRegionToFrameSize = this.editor.scaleRegionToFrameSize.bind(this.editor);
        this.scaleRegionToSourceSize = this.editor.scaleRegionToSourceSize.bind(this.editor);
        this.setSelectionMode = this.editor.setSelectionMode.bind(this.editor);

        // Expose CanvasTools RegionManager API
        this.addRegion = this.editor.RM.addRegion.bind(this.editor.RM);
        this.addPointRegion = this.editor.RM.addPointRegion.bind(this.editor.RM);
        this.addPolylineRegion = this.editor.RM.addPolylineRegion.bind(this.editor.RM);
        this.addRectRegion = this.editor.RM.addRectRegion.bind(this.editor.RM);
        this.deleteAllRegions = this.editor.RM.deleteAllRegions.bind(this.editor.RM);
        this.deleteRegionById = this.editor.RM.deleteRegionById.bind(this.editor.RM);
        this.freeze = this.editor.RM.freeze.bind(this.editor.RM);
        this.getSelectedRegionsBounds = this.editor.RM.getSelectedRegionsBounds.bind(this.editor.RM);
        this.redrawAllRegions = this.editor.RM.redrawAllRegions.bind(this.editor.RM);
        this.resize = this.editor.RM.resize.bind(this.editor.RM);
        this.selectRegionById = this.editor.RM.selectRegionById.bind(this.editor.RM);
        this.toggleFreezeMode = this.editor.RM.toggleFreezeMode.bind(this.editor.RM);
        this.unfreeze = this.editor.RM.unfreeze.bind(this.editor.RM);
        this.updateTagsById = this.editor.RM.updateTagsById.bind(this.editor.RM);
        this.updateTagsForSelectedRegions = this.editor.RM.updateTagsForSelectedRegions.bind(this.editor.RM);

        this.editor.onSelectionEnd = this.onSelectionEnd.bind(this);

        this.editor.onRegionMove = this.onRegionMove.bind(this);

        this.editor.onRegionDelete = this.onRegionDelete.bind(this);

        this.editor.onRegionSelected = this.onRegionSelected.bind(this);

        // Upload background image for selection
        await this.updateEditor();
    }

    public async componentDidUpdate(prevProps) {
        if (this.props.selectedAsset.asset.path !== prevProps.selectedAsset.asset.path) {
            await this.updateEditor();
            if (this.props.selectedAsset.regions.length) {
                this.updateSelected([]);
            }
        }
    }

    public render() {
        const { selectedAsset } = this.props;

        return (
            <div id="ct-zone" className={this.state.canvasEnabled ? "canvas-enabled" : "canvas-disabled"}>
                {selectedAsset.asset.type === AssetType.Video &&
                    <Player ref={this.videoPlayer}
                        fluid={false} width={"100%"} height={"100%"}
                        autoPlay={true}
                        poster={""}
                        src={`${selectedAsset.asset.path}`}
                    >
                        <BigPlayButton position="center" />
                        <ControlBar>
                            <CurrentTimeDisplay order={1.1} />
                            <TimeDivider order={1.2} />
                            <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.25]} order={7.1} />
                            <VolumeMenuButton enabled order={7.2} />
                        </ControlBar>
                    </Player>
                }
                <div id="selection-zone" className={`asset-${this.getAssetType()}`}>
                    <div id="editor-zone" className="full-size" />
                </div>
            }
            </React.Fragment>
            );
    }

    /**
     * @name onSelectionEnd
     * @description Method that gets called when a new region is drawn
     * @param {RegionData} commit the RegionData of created region
     * @returns {void}
     */
    public onSelectionEnd = (commit: RegionData) => {
        const id = shortid.generate();

        this.addRegion(id, commit, null);

        // RegionData not serializable so need to extract data
        const scaledRegionData = this.scaleRegionToSourceSize(commit);
        const newRegion = {
            id,
            type: this.editorModeToType(this.props.editorMode),
            tags: [],
            boundingBox: {
                height: scaledRegionData.height,
                width: scaledRegionData.width,
                left: scaledRegionData.x,
                top: scaledRegionData.y,
            },
            points: scaledRegionData.points,
        };
        const currentAssetMetadata = this.props.selectedAsset;
        currentAssetMetadata.regions.push(newRegion);
        this.updateSelected([newRegion]);
        if (currentAssetMetadata.regions.length) {
            currentAssetMetadata.asset.state = AssetState.Tagged;
        }
        this.props.onAssetMetadataChanged(currentAssetMetadata);
    }

    /**
     * @name onRegionMove
     * @description Method called when moving a region already in the editor
     * @param {string} id the id of the region that was moved
     * @param {RegionData} regionData the RegionData of moved region
     * @returns {void}
     */
    public onRegionMove = (id: string, regionData: RegionData) => {
        const ct = CanvasTools;
        const currentAssetMetadata = this.props.selectedAsset;
        const movedRegionIndex = currentAssetMetadata.regions.findIndex((region) => region.id === id);
        const movedRegion = currentAssetMetadata.regions[movedRegionIndex];
        // @ts-ignore   in here until CanvasTools types get updated
        const scaledRegionData = this.scaleRegionToSourceSize(regionData);
        if (movedRegion) {
            movedRegion.points = scaledRegionData.points;
        }
        currentAssetMetadata.regions[movedRegionIndex] = movedRegion;
        this.updateSelected([movedRegion]);
        this.props.onAssetMetadataChanged(currentAssetMetadata);
    }

    /**
     * @name onRegionDelete
     * @description Method called when deleting a region from the editor
     * @param {string} id the id of the deleted region
     * @returns {void}
     */
    public onRegionDelete = (id: string) => {
        this.deleteRegionById(id);
        const currentAssetMetadata = this.props.selectedAsset;
        const deletedRegionIndex = this.props.selectedAsset.regions.findIndex((region) => region.id === id);
        currentAssetMetadata.regions.splice(deletedRegionIndex, 1);
        if (!currentAssetMetadata.regions.length) {
            currentAssetMetadata.asset.state = AssetState.Visited;
        }
        this.props.onAssetMetadataChanged(currentAssetMetadata);
        this.updateSelected([]);
    }

    /**
     * @name onRegionSelected
     * @description Method called when deleting a region from the editor
     * @param {string} id the id of the deleted region
     * @param {boolean} multiselection boolean whether multiselect is active
     * @returns {void}
     */
    public onRegionSelected = (id: string, multiselect: boolean) => {
        let selectedRegions = this.state.selectedRegions;
        if (multiselect) {
            selectedRegions.push(
                this.props.selectedAsset.regions.find((region) => region.id === id));
        } else {
            selectedRegions = [
                this.props.selectedAsset.regions.find((region) => region.id === id)];
        }
        this.updateSelected(selectedRegions);
    }

    /**
     * Updates the background of the canvas and draws the asset's regions
     */
    private async updateEditor() {
        this.deleteAllRegions();
        await this.loadAsset();
    }

    /**
     * Loads the asset into the canvas editor
     */
    private async loadAsset() {
        // We need to check if we're looking for a video or image
        if (this.props.selectedAsset.asset.type === AssetType.Image) {
            await this.loadImage();
        } else if (this.props.selectedAsset.asset.type === AssetType.Video) {
            await this.loadVideo();
        } else {
            // We don't know what type of asset this is?
            throw new AppError(ErrorCode.CanvasError, strings.editorPage.assetError);
        }
    }

    /**
     *  loads a video into the canvas
     */
    private loadVideo() {
        this.setState({ canvasEnabled: false });
        this.videoPlayer.current.subscribeToStateChange(this.onVideoStateChange.bind(this));
        return Promise.resolve();
    }

    /**
     * loads an image into the canvas
     */
    private loadImage() {
        return new Promise((resolve) => {
            const image = new Image();
            image.addEventListener("load", async (e) => {
                // @ts-ignore
                await this.editor.addContentSource(e.target);
                this.updateRegions();
                resolve();
            });
            image.src = this.props.selectedAsset.asset.path;
        });
    }

    /**
     * Reacts to changes in the video player state
     * @param state The current state of the video player
     * @param prev The previous state of the video player
     */
    private async onVideoStateChange(state, prev) {
        // If the video is paused, add this frame to the editor content
        if (state.paused && (state.currentTime !== prev.currentTime || state.seeking !== prev.seeking)) {
            // If we're paused, make sure we're behind the canvas so we can tag
            const video = this.videoPlayer.current.video.video as HTMLVideoElement;
            if (video.videoHeight > 0 && video.videoWidth > 0) {
                await this.editor.addContentSource(this.videoPlayer.current.video.video);
            }
            this.setState({ canvasEnabled: true });
            this.updateRegions();
            console.log(state);
        } else if (!state.paused && state.paused !== prev.paused) {
            // We need to make sure we're on top if we are playing
            this.setState({ canvasEnabled: false });
        }
    }

    private updateRegions() {
        if (this.props.selectedAsset.regions.length) {
            this.props.selectedAsset.regions.forEach((region: IRegion) => {
                const loadedRegionData = new RegionData(region.boundingBox.left,
                    region.boundingBox.top,
                    region.boundingBox.width,
                    region.boundingBox.height,
                    region.points.map((point) =>
                        new Point2D(point.x, point.y)),
                    this.regionTypeToType(region.type));
                if (region.tags.length) {
                    this.addRegion(region.id, this.scaleRegionToFrameSize(loadedRegionData),
                        new TagsDescriptor(region.tags.map((tag) => new Tag(tag.name,
                            this.props.project.tags.find((t) => t.name === tag.name).color))));
                } else {
                    this.addRegion(region.id, this.scaleRegionToFrameSize(loadedRegionData),
                        new TagsDescriptor());
                }
                if (this.state.selectedRegions) {
                    this.setState({
                        selectedRegions: [this.props.selectedAsset.regions[
                            this.props.selectedAsset.regions.length - 1]],
                    });
                }
            });
        }
    }

    private updateSelected(selectedRegions: IRegion[]) {
        this.setState({
            selectedRegions,
        });
    }

    private getAssetType() {
        switch (this.props.selectedAsset.asset.type) {
            case AssetType.Image:
                return "image";
            case AssetType.Video:
                return "video";
            default:
                return "unknown";
        }
    }

    private regionTypeToType(regionType: RegionType) {
        let type;
        switch (regionType) {
            case RegionType.Rectangle:
                type = RegionDataType.Rect;
                break;
            case RegionType.Polygon:
                type = RegionDataType.Polygon;
                break;
            case RegionType.Point:
                type = RegionDataType.Point;
                break;
            case RegionType.Polyline:
                type = RegionDataType.Polyline;
                break;
            default:
                break;
        }
        return type;
    }

    private editorModeToType(editorMode: EditorMode) {
        let type;
        switch (editorMode) {
            case EditorMode.Rectangle:
                type = RegionType.Rectangle;
                break;
            case EditorMode.Polygon:
                type = RegionType.Polygon;
                break;
            case EditorMode.Point:
                type = RegionType.Point;
                break;
            case EditorMode.Polyline:
                type = RegionType.Polyline;
                break;
            default:
                break;
        }
        return type;
    }
}
