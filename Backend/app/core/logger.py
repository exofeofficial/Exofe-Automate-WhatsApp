import logging
import os
from logging.handlers import RotatingFileHandler

def get_logger(name: str, level: str | int=20, log_to_file: bool=True) -> logging.Logger:
    logger = logging.getLogger(name)
    if logger.handlers:
        return logger
    
    formatter = logging.Formatter(
        "{asctime} - {name} - {levelname} - {message}", 
        style="{",
        datefmt="%Y-%m-%d %H:%M"
    )
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)
    
    if log_to_file:
        log_dirs = 'logs'
        log_filepath = os.path.join(log_dirs, "app.log") 
        
        os.makedirs(log_dirs, exist_ok=True)
        
        file_handler = RotatingFileHandler(
            filename=log_filepath,
            mode='a',
            maxBytes= 5 * 1024 * 1024,
            encoding='utf-8',
            backupCount=5
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    
    logger.setLevel(level)
    logger.propagate = False
    
    return logger