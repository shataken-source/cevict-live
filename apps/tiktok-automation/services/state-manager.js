/**
 * State Manager
 * 
 * Tracks replied comments, DMs, posted videos to prevent duplicates
 */

const fs = require('fs');
const path = require('path');
const { resolveProjectPath } = require('../config/loader');

class StateManager {
  constructor(stateFile) {
    this.stateFile = resolveProjectPath(stateFile);
    this.state = this.loadState();
    this.ensureStateDir();
  }

  ensureStateDir() {
    const dir = path.dirname(this.stateFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  loadState() {
    if (fs.existsSync(this.stateFile)) {
      try {
        const content = fs.readFileSync(this.stateFile, 'utf8');
        return JSON.parse(content);
      } catch (error) {
        console.warn(`Failed to load state from ${this.stateFile}:`, error.message);
        return this.getDefaultState();
      }
    }
    return this.getDefaultState();
  }

  getDefaultState() {
    return {
      commentIds: [],
      dmIds: [],
      postedVideoIds: [],
      lastChecked: null,
      lastPostTime: null,
      lastReplyTime: null,
    };
  }

  saveState() {
    try {
      fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2), 'utf8');
    } catch (error) {
      console.error(`Failed to save state to ${this.stateFile}:`, error.message);
    }
  }

  hasRepliedToComment(commentId) {
    return this.state.commentIds.includes(commentId);
  }

  markCommentReplied(commentId) {
    if (!this.hasRepliedToComment(commentId)) {
      this.state.commentIds.push(commentId);
      this.state.lastReplyTime = new Date().toISOString();
      this.saveState();
    }
  }

  hasRepliedToDM(dmId) {
    return this.state.dmIds.includes(dmId);
  }

  markDMReplied(dmId) {
    if (!this.hasRepliedToDM(dmId)) {
      this.state.dmIds.push(dmId);
      this.saveState();
    }
  }

  hasPostedVideo(videoId) {
    return this.state.postedVideoIds.includes(videoId);
  }

  markVideoPosted(videoId) {
    if (!this.hasPostedVideo(videoId)) {
      this.state.postedVideoIds.push(videoId);
      this.state.lastPostTime = new Date().toISOString();
      this.saveState();
    }
  }

  updateLastChecked() {
    this.state.lastChecked = new Date().toISOString();
    this.saveState();
  }

  // Cleanup old entries (keep last 1000)
  cleanup(maxEntries = 1000) {
    if (this.state.commentIds.length > maxEntries) {
      this.state.commentIds = this.state.commentIds.slice(-maxEntries);
    }
    if (this.state.dmIds.length > maxEntries) {
      this.state.dmIds = this.state.dmIds.slice(-maxEntries);
    }
    if (this.state.postedVideoIds.length > maxEntries) {
      this.state.postedVideoIds = this.state.postedVideoIds.slice(-maxEntries);
    }
    this.saveState();
  }
}

module.exports = StateManager;
